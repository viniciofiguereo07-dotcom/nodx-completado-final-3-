import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  bootstrapDone: boolean | null;   // null = not yet loaded
  mustChangePassword: boolean;
  // Sign in by email/password (internal Supabase)
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  // Sign in by user code + password — resolves code to email then authenticates
  signInWithCode: (userCode: string, orgSlug: string | null, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  logAccessEvent: (eventType: string, metadata?: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [bootstrapDone, setBootstrapDone] = useState<boolean | null>(null);

  async function loadBootstrap() {
    const { data } = await supabase
      .from('platform_bootstrap')
      .select('bootstrap_done')
      .eq('id', 1)
      .maybeSingle();
    setBootstrapDone(data?.bootstrap_done ?? false);
  }

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data ?? null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  useEffect(() => {
    loadBootstrap();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && user) {
      await logAccessEvent('login');
    }
    return { error: error?.message ?? null };
  }

  async function signInWithCode(userCode: string, orgSlug: string | null, password: string) {
    // Resolve user code to email via user_codes table
    // We use the service-level lookup: join user_codes -> profiles -> auth.users
    // Since user_codes only stores user_id we need the user's email from auth.users
    // We query profiles (which mirrors auth.users) using user_code column
    const codeUpper = userCode.trim().toUpperCase();

    // First try direct profile lookup by user_code
    const { data: profileMatch } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('user_code', codeUpper)
      .maybeSingle();

    if (!profileMatch?.email) {
      return { error: 'Invalid user code or code not found. Contact your administrator.' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: profileMatch.email,
      password,
    });

    if (error) {
      await logAccessEvent('login_failed', { user_code: codeUpper });
      return { error: 'Invalid credentials.' };
    }

    return { error: null };
  }

  async function signOut() {
    if (user) await logAccessEvent('logout');
    await supabase.auth.signOut();
  }

  async function logAccessEvent(eventType: string, metadata: Record<string, unknown> = {}) {
    try {
      await supabase.from('access_events').insert({
        user_id: user?.id ?? null,
        event_type: eventType,
        metadata,
      });
    } catch {
      // Non-blocking — audit failures must not interrupt auth flow
    }
  }

  const mustChangePassword = profile
    ? Boolean((profile as Profile & { must_change_password?: boolean }).must_change_password)
    : false;

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      bootstrapDone,
      mustChangePassword,
      signIn, signInWithCode, signOut, refreshProfile, logAccessEvent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
