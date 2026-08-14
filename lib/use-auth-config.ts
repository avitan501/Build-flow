"use client";

import { useSyncExternalStore } from "react";

import { hasSupabasePublicEnv } from "@/lib/supabase/env";

type AuthConfigState = boolean | null;

function subscribeToAuthConfig() {
  return () => undefined;
}

function getBrowserAuthConfig(): AuthConfigState {
  return hasSupabasePublicEnv();
}

function getServerAuthConfig(): AuthConfigState {
  return null;
}

export function useAuthConfig() {
  return useSyncExternalStore(subscribeToAuthConfig, getBrowserAuthConfig, getServerAuthConfig);
}
