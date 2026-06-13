import { supabase } from '../lib/supabase';
import type { Role, Permission, RolePermission } from '../types';

// ---------------------------------------------------------------------------
// Types for Security Engine
// ---------------------------------------------------------------------------

export interface SecurityAuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: SecurityAction;
  resource_type: string;
  resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type SecurityAction =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'role_assigned'
  | 'role_revoked'
  | 'permission_granted'
  | 'permission_revoked'
  | 'break_glass_activated'
  | 'break_glass_deactivated'
  | 'recovery_key_generated'
  | 'recovery_key_used'
  | 'emergency_token_created'
  | 'emergency_token_revoked'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'access_denied'
  | 'suspicious_activity';

export interface RecoveryKey {
  id: string;
  organization_id: string;
  user_id: string;
  key_type: 'A' | 'B' | 'C';
  key_hash: string;
  hint: string | null;
  usage_count: number;
  max_uses: number;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface EmergencyToken {
  id: string;
  organization_id: string;
  token_hash: string;
  token_prefix: string;
  granted_role: UserRole;
  granted_permissions: string[];
  reason: string;
  activated_by: string | null;
  activated_at: string | null;
  expires_at: string;
  ip_restriction: string | null;
  usage_count: number;
  max_uses: number;
  status: 'pending' | 'active' | 'expired' | 'revoked' | 'exhausted';
  created_by: string;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface BreakGlassSession {
  id: string;
  organization_id: string;
  user_id: string;
  justification: string;
  elevated_permissions: string[];
  original_role: UserRole;
  elevated_at: string;
  expires_at: string;
  ip_address: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
}

export interface SecurityPolicy {
  id: string;
  organization_id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  created_at: string;
  updated_at: string;
}

type UserRole = 'super_admin' | 'org_admin' | 'project_manager' | 'supervisor' | 'agent' | 'auditor' | 'viewer';

// ---------------------------------------------------------------------------
// Engine class
// ---------------------------------------------------------------------------

class TerritorialSecurityEngineClass {
  private readonly AUDIT_TABLE = 'security_audit_logs';
  private readonly RECOVERY_KEY_TABLE = 'recovery_keys';
  private readonly EMERGENCY_TOKEN_TABLE = 'emergency_tokens';
  private readonly BREAK_GLASS_TABLE = 'break_glass_sessions';
  private readonly SECURITY_POLICY_TABLE = 'security_policies';

  // -------------------------------------------------------------------------
  // Role Management
  // -------------------------------------------------------------------------

  async getRoles(organizationId: string): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_system.eq.true`)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getRole(roleId: string): Promise<Role | null> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createRole(input: {
    organizationId: string;
    name: string;
    displayName: string;
    description?: string;
    color?: string;
  }): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        display_name: input.displayName,
        description: input.description ?? null,
        is_system: false,
        color: input.color ?? '#3b82f6',
      })
      .select()
      .single();
    if (error) throw error;

    await this.logAudit({
      organizationId: input.organizationId,
      action: 'role_assigned',
      resourceType: 'role',
      resourceId: data.id,
      newValue: { name: data.name, displayName: data.display_name },
    });

    return data;
  }

  async updateRole(roleId: string, patch: {
    displayName?: string;
    description?: string | null;
    color?: string;
  }): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .update({
        display_name: patch.displayName,
        description: patch.description,
        color: patch.color,
      })
      .eq('id', roleId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteRole(roleId: string, organizationId: string): Promise<void> {
    const role = await this.getRole(roleId);
    if (role?.is_system) throw new Error('Cannot delete system roles');

    await supabase.from('roles').delete().eq('id', roleId);

    await this.logAudit({
      organizationId,
      action: 'role_revoked',
      resourceType: 'role',
      resourceId: roleId,
      oldValue: { name: role?.name },
    });
  }

  // -------------------------------------------------------------------------
  // Permission Management
  // -------------------------------------------------------------------------

  async getPermissions(module?: string): Promise<Permission[]> {
    let query = supabase.from('permissions').select('*');
    if (module) query = query.eq('module', module);
    const { data, error } = await query.order('module').order('key');
    if (error) throw error;
    return data ?? [];
  }

  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId);
    if (error) throw error;
    return data ?? [];
  }

  async grantPermission(roleId: string, permissionKey: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .insert({ role_id: roleId, permission_key: permissionKey });
    if (error) throw error;

    await this.logAudit({
      organizationId,
      action: 'permission_granted',
      resourceType: 'role_permission',
      resourceId: `${roleId}:${permissionKey}`,
      newValue: { roleId, permissionKey },
    });
  }

  async revokePermission(roleId: string, permissionKey: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_key', permissionKey);
    if (error) throw error;

    await this.logAudit({
      organizationId,
      action: 'permission_revoked',
      resourceType: 'role_permission',
      resourceId: `${roleId}:${permissionKey}`,
      oldValue: { roleId, permissionKey },
    });
  }

  async checkPermission(userId: string, permissionKey: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_permission_key: permissionKey,
    });
    if (error) {
      console.error('Permission check error:', error);
      return false;
    }
    return data ?? false;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId,
    });
    if (error) throw error;
    return data ?? [];
  }

  // -------------------------------------------------------------------------
  // Recovery Keys (A, B, C)
  // -------------------------------------------------------------------------

  async getRecoveryKeys(organizationId: string, userId?: string): Promise<RecoveryKey[]> {
    let query = supabase
      .from(this.RECOVERY_KEY_TABLE)
      .select('*')
      .eq('organization_id', organizationId)
      .is('revoked_at', null);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async generateRecoveryKey(input: {
    organizationId: string;
    userId: string;
    keyType: 'A' | 'B' | 'C';
    hint?: string;
    expiresInDays?: number;
    maxUses?: number;
  }, createdBy: string): Promise<{ key: RecoveryKey; plainKey: string }> {
    const plainKey = this.generateSecureToken(32);
    const keyHash = await this.hashToken(plainKey);

    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from(this.RECOVERY_KEY_TABLE)
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        key_type: input.keyType,
        key_hash: keyHash,
        hint: input.hint ?? null,
        usage_count: 0,
        max_uses: input.maxUses ?? (input.keyType === 'A' ? 1 : input.keyType === 'B' ? 3 : 5),
        expires_at: expiresAt,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      organizationId: input.organizationId,
      userId: createdBy,
      action: 'recovery_key_generated',
      resourceType: 'recovery_key',
      resourceId: data.id,
      newValue: { keyType: input.keyType, userId: input.userId },
    });

    return { key: data, plainKey };
  }

  async validateRecoveryKey(organizationId: string, plainKey: string, userId?: string): Promise<RecoveryKey | null> {
    const keys = await this.getRecoveryKeys(organizationId, userId);

    for (const key of keys) {
      if (key.expires_at && new Date(key.expires_at) < new Date()) continue;
      if (key.usage_count >= key.max_uses) continue;

      const isValid = await this.verifyToken(plainKey, key.key_hash);
      if (isValid) {
        await this.useRecoveryKey(key);
        return key;
      }
    }
    return null;
  }

  private async useRecoveryKey(key: RecoveryKey): Promise<void> {
    await supabase
      .from(this.RECOVERY_KEY_TABLE)
      .update({
        usage_count: key.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', key.id);

    await this.logAudit({
      organizationId: key.organization_id,
      userId: key.user_id,
      action: 'recovery_key_used',
      resourceType: 'recovery_key',
      resourceId: key.id,
    });
  }

  async revokeRecoveryKey(keyId: string, revokedBy: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from(this.RECOVERY_KEY_TABLE)
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
      })
      .eq('id', keyId);
    if (error) throw error;

    await this.logAudit({
      organizationId,
      userId: revokedBy,
      action: 'recovery_key_used',
      resourceType: 'recovery_key',
      resourceId: keyId,
      oldValue: { revoked: true },
    });
  }

  // -------------------------------------------------------------------------
  // Universal Emergency Token
  // -------------------------------------------------------------------------

  async getEmergencyTokens(organizationId: string, status?: string): Promise<EmergencyToken[]> {
    let query = supabase
      .from(this.EMERGENCY_TOKEN_TABLE)
      .select('*')
      .eq('organization_id', organizationId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createEmergencyToken(input: {
    organizationId: string;
    grantedRole: UserRole;
    grantedPermissions: string[];
    reason: string;
    expiresInHours: number;
    ipRestriction?: string;
    maxUses?: number;
  }, createdBy: string): Promise<{ token: EmergencyToken; plainToken: string }> {
    const plainToken = `EMG_${this.generateSecureToken(24)}`;
    const tokenHash = await this.hashToken(plainToken);
    const tokenPrefix = plainToken.substring(0, 12);

    const { data, error } = await supabase
      .from(this.EMERGENCY_TOKEN_TABLE)
      .insert({
        organization_id: input.organizationId,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        granted_role: input.grantedRole,
        granted_permissions: input.grantedPermissions,
        reason: input.reason,
        expires_at: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString(),
        ip_restriction: input.ipRestriction ?? null,
        usage_count: 0,
        max_uses: input.maxUses ?? 1,
        status: 'pending',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      organizationId: input.organizationId,
      userId: createdBy,
      action: 'emergency_token_created',
      resourceType: 'emergency_token',
      resourceId: data.id,
      newValue: { grantedRole: input.grantedRole, reason: input.reason },
    });

    return { token: data, plainToken };
  }

  async activateEmergencyToken(organizationId: string, plainToken: string, userId: string): Promise<EmergencyToken | null> {
    const tokens = await this.getEmergencyTokens(organizationId, 'pending');

    for (const token of tokens) {
      if (new Date(token.expires_at) < new Date()) {
        await this.expireEmergencyToken(token);
        continue;
      }

      const isValid = await this.verifyToken(plainToken, token.token_hash);
      if (isValid) {
        if (token.ip_restriction) {
          // In real implementation, check IP here
        }

        const { data, error } = await supabase
          .from(this.EMERGENCY_TOKEN_TABLE)
          .update({
            status: 'active',
            activated_by: userId,
            activated_at: new Date().toISOString(),
            usage_count: token.usage_count + 1,
          })
          .eq('id', token.id)
          .select()
          .single();

        if (error) throw error;

        // Check if exhausted
        if (data.usage_count >= data.max_uses) {
          await supabase
            .from(this.EMERGENCY_TOKEN_TABLE)
            .update({ status: 'exhausted' })
            .eq('id', data.id);
          data.status = 'exhausted';
        }

        await this.logAudit({
          organizationId,
          userId,
          action: 'emergency_token_created',
          resourceType: 'emergency_token',
          resourceId: data.id,
        });

        return data;
      }
    }
    return null;
  }

  async revokeEmergencyToken(tokenId: string, revokedBy: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from(this.EMERGENCY_TOKEN_TABLE)
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
      })
      .eq('id', tokenId);
    if (error) throw error;

    await this.logAudit({
      organizationId,
      userId: revokedBy,
      action: 'emergency_token_revoked',
      resourceType: 'emergency_token',
      resourceId: tokenId,
    });
  }

  private async expireEmergencyToken(token: EmergencyToken): Promise<void> {
    await supabase
      .from(this.EMERGENCY_TOKEN_TABLE)
      .update({ status: 'expired' })
      .eq('id', token.id);
  }

  // -------------------------------------------------------------------------
  // Break Glass Mode
  // -------------------------------------------------------------------------

  async getBreakGlassSessions(organizationId: string, activeOnly?: boolean): Promise<BreakGlassSession[]> {
    let query = supabase
      .from(this.BREAK_GLASS_TABLE)
      .select('*')
      .eq('organization_id', organizationId);
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async activateBreakGlass(input: {
    organizationId: string;
    userId: string;
    justification: string;
    elevatedPermissions: string[];
    durationMinutes: number;
    originalRole: UserRole;
    ipAddress?: string;
  }): Promise<BreakGlassSession> {
    const expiresAt = new Date(Date.now() + input.durationMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(this.BREAK_GLASS_TABLE)
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        justification: input.justification,
        elevated_permissions: input.elevatedPermissions,
        original_role: input.originalRole,
        elevated_at: new Date().toISOString(),
        expires_at: expiresAt,
        ip_address: input.ipAddress ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      organizationId: input.organizationId,
      userId: input.userId,
      action: 'break_glass_activated',
      resourceType: 'break_glass_session',
      resourceId: data.id,
      newValue: {
        permissions: input.elevatedPermissions,
        justification: input.justification,
        expiresAt,
      },
      metadata: { ipAddress: input.ipAddress },
    });

    return data;
  }

  async deactivateBreakGlass(sessionId: string, deactivatedBy: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from(this.BREAK_GLASS_TABLE)
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: deactivatedBy,
      })
      .eq('id', sessionId);
    if (error) throw error;

    await this.logAudit({
      organizationId,
      userId: deactivatedBy,
      action: 'break_glass_deactivated',
      resourceType: 'break_glass_session',
      resourceId: sessionId,
    });
  }

  async getActiveBreakGlassSession(userId: string): Promise<BreakGlassSession | null> {
    const { data, error } = await supabase
      .from(this.BREAK_GLASS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async cleanupExpiredBreakGlassSessions(): Promise<number> {
    const now = new Date().toISOString();
    const { data: expired } = await supabase
      .from(this.BREAK_GLASS_TABLE)
      .select('id, organization_id')
      .eq('is_active', true)
      .lt('expires_at', now);

    if (!expired || expired.length === 0) return 0;

    for (const session of expired) {
      await this.deactivateBreakGlass(session.id, 'system', session.organization_id);
    }

    return expired.length;
  }

  // -------------------------------------------------------------------------
  // Security Audit Logging
  // -------------------------------------------------------------------------

  async logAudit(input: {
    organizationId: string;
    userId?: string;
    action: SecurityAction;
    resourceType: string;
    resourceId?: string | null;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await supabase.from(this.AUDIT_TABLE).insert({
      organization_id: input.organizationId,
      user_id: input.userId ?? null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      ip_address: null,
      user_agent: navigator?.userAgent ?? null,
      metadata: input.metadata ?? {},
    });
  }

  async getAuditLogs(organizationId: string, opts?: {
    userId?: string;
    action?: SecurityAction;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<SecurityAuditLog[]> {
    let query = supabase
      .from(this.AUDIT_TABLE)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (opts?.userId) query = query.eq('user_id', opts.userId);
    if (opts?.action) query = query.eq('action', opts.action);
    if (opts?.resourceType) query = query.eq('resource_type', opts.resourceType);
    if (opts?.startDate) query = query.gte('created_at', opts.startDate);
    if (opts?.endDate) query = query.lte('created_at', opts.endDate);
    if (opts?.limit) query = query.limit(opts.limit);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getAuditStats(organizationId: string): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    last24h: number;
    suspiciousCount: number;
  }> {
    const logs = await this.getAuditLogs(organizationId, { limit: 10000 });

    const last24h = logs.filter(l => {
      const logTime = new Date(l.created_at).getTime();
      return Date.now() - logTime < 24 * 60 * 60 * 1000;
    }).length;

    const byAction: Record<string, number> = {};
    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] ?? 0) + 1;
    }

    const suspiciousCount = logs.filter(l =>
      l.action === 'suspicious_activity' ||
      l.action === 'access_denied' ||
      l.action === 'break_glass_activated'
    ).length;

    return {
      totalLogs: logs.length,
      byAction,
      last24h,
      suspiciousCount,
    };
  }

  // -------------------------------------------------------------------------
  // Security Policies
  // -------------------------------------------------------------------------

  async getSecurityPolicies(organizationId: string): Promise<SecurityPolicy[]> {
    const { data, error } = await supabase
      .from(this.SECURITY_POLICY_TABLE)
      .select('*')
      .eq('organization_id', organizationId);
    if (error) throw error;
    return data ?? [];
  }

  async setSecurityPolicy(organizationId: string, key: string, value: Record<string, unknown>, description?: string): Promise<SecurityPolicy> {
    const { data, error } = await supabase
      .from(this.SECURITY_POLICY_TABLE)
      .upsert({
        organization_id: organizationId,
        key,
        value,
        description: description ?? null,
      }, { onConflict: 'organization_id,key' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  private generateSecureToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, x => chars[x % chars.length]).join('');
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyToken(token: string, hash: string): Promise<boolean> {
    const computedHash = await this.hashToken(token);
    return computedHash === hash;
  }
}

export const territorialSecurityEngine = new TerritorialSecurityEngineClass();
