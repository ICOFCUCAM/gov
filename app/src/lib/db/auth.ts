// lib/db/auth — auth client wrappers.
//
// Thin facade over @supabase/supabase-js auth methods, exposing only the
// operations the app uses. The session is persisted in the browser by
// the publicClient; in SSR contexts the same calls return null/no-op.

import { publicClient } from '@/lib/db/client';
import type { Session, User } from '@supabase/supabase-js';

export type { Session, User };

export async function signInWithPassword(email: string, password: string): Promise<{ session: Session | null; error: string | null }> {
  const sb = publicClient();
  if (!sb) return { session: null, error: 'auth unavailable: substrate not configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { session: data.session, error: error?.message ?? null };
}

export async function signUpWithPassword(email: string, password: string): Promise<{ session: Session | null; error: string | null }> {
  const sb = publicClient();
  if (!sb) return { session: null, error: 'auth unavailable: substrate not configured' };
  const { data, error } = await sb.auth.signUp({ email, password });
  return { session: data.session, error: error?.message ?? null };
}

export async function signInWithOtp(email: string, redirectTo?: string): Promise<{ error: string | null }> {
  const sb = publicClient();
  if (!sb) return { error: 'auth unavailable: substrate not configured' };
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<{ error: string | null }> {
  const sb = publicClient();
  if (!sb) return { error: null };
  const { error } = await sb.auth.signOut();
  return { error: error?.message ?? null };
}

export async function currentSession(): Promise<Session | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export function onAuthStateChange(cb: (session: Session | null) => void): () => void {
  const sb = publicClient();
  if (!sb) return () => { /* noop */ };
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
