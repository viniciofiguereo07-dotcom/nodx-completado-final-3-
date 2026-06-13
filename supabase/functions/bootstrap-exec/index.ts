import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NODX_ROOT_CONFIG = {
  email: 'nodxroot@nodx.internal',
  password: '121718',
  fullName: 'NODX Root Administrator',
  userCode: 'NODXROOT',
  orgName: 'NODX',
  orgSlug: 'nodx',
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if bootstrap already done
    const { data: bootstrapStatus } = await supabase
      .from('platform_bootstrap')
      .select('*')
      .eq('id', 1)
      .single();

    if (bootstrapStatus?.bootstrap_done) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Bootstrap already completed',
        status: bootstrapStatus,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the NODXROOT user using admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: NODX_ROOT_CONFIG.email,
      password: NODX_ROOT_CONFIG.password,
      email_confirm: true,
      user_metadata: {
        full_name: NODX_ROOT_CONFIG.fullName,
        user_code: NODX_ROOT_CONFIG.userCode,
      },
    });

    let rootUserId: string;

    if (userError) {
      if (userError.message.includes('already registered') || userError.message.includes('already exists')) {
        // User exists, get their ID
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === NODX_ROOT_CONFIG.email);
        if (existingUser) {
          rootUserId = existingUser.id;
        } else {
          throw new Error('NODXROOT user exists but cannot be found');
        }
      } else {
        throw userError;
      }
    } else {
      rootUserId = userData.user.id;
    }

    // Create or update profile
    await supabase.from('profiles').upsert({
      id: rootUserId,
      email: NODX_ROOT_CONFIG.email,
      full_name: NODX_ROOT_CONFIG.fullName,
      user_code: NODX_ROOT_CONFIG.userCode,
      nodx_access_level: 0,
      must_change_password: false,
    }, { onConflict: 'id' });

    // Create NODX organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        name: NODX_ROOT_CONFIG.orgName,
        slug: NODX_ROOT_CONFIG.orgSlug,
        is_active: true,
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (orgError && !orgError.message.includes('duplicate')) {
      throw orgError;
    }

    let orgId: string;
    if (orgData) {
      orgId = orgData.id;
    } else {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', NODX_ROOT_CONFIG.orgSlug)
        .single();
      orgId = existingOrg!.id;
    }

    // Create organization membership
    await supabase.from('organization_members').upsert({
      organization_id: orgId,
      user_id: rootUserId,
      role: 'super_admin',
      is_active: true,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,user_id' });

    // Activate all modules
    const { data: allModules } = await supabase.from('modules').select('key');
    if (allModules && allModules.length > 0) {
      await supabase.from('organization_modules').delete().eq('organization_id', orgId);
      await supabase.from('organization_modules').insert(
        allModules.map(m => ({
          organization_id: orgId,
          module_key: m.key,
          is_active: true,
          enabled_at: new Date().toISOString(),
        }))
      );
    }

    // Assign Enterprise license
    const { data: enterprisePlan } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'Enterprise')
      .single();

    if (enterprisePlan) {
      await supabase.from('licenses').upsert({
        organization_id: orgId,
        plan_id: enterprisePlan.id,
        status: 'active',
        starts_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });
    }

    // Create example territories
    const territories = [
      { name: 'Territorio Central', code: 'TC-001', level: 'municipality' },
      { name: 'Territorio Norte', code: 'TN-001', level: 'municipality' },
      { name: 'Territorio Sur', code: 'TS-001', level: 'municipality' },
    ];

    for (const territory of territories) {
      await supabase.from('territories').upsert({
        organization_id: orgId,
        name: territory.name,
        code: territory.code,
        level: territory.level,
        is_active: true,
      }, { onConflict: 'organization_id,code' });
    }

    // Mark bootstrap as complete
    await supabase.from('platform_bootstrap').upsert({
      id: 1,
      bootstrap_done: true,
      bootstrapped_at: new Date().toISOString(),
      bootstrapped_by: rootUserId,
      nodx_root_user_id: rootUserId,
    }, { onConflict: 'id' });

    // Log access event
    await supabase.from('access_events').insert({
      user_id: rootUserId,
      organization_id: orgId,
      event_type: 'bootstrap_completed',
      metadata: {
        user_code: NODX_ROOT_CONFIG.userCode,
        org_name: NODX_ROOT_CONFIG.orgName,
        auto_bootstrap: true,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Bootstrap completed successfully',
      data: {
        rootUser: {
          id: rootUserId,
          email: NODX_ROOT_CONFIG.email,
          userCode: NODX_ROOT_CONFIG.userCode,
        },
        organization: {
          id: orgId,
          name: NODX_ROOT_CONFIG.orgName,
          slug: NODX_ROOT_CONFIG.orgSlug,
        },
        role: 'L0 Root Administrator',
        modulesActivated: allModules?.length || 0,
        territoriesCreated: territories.length,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bootstrap error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
