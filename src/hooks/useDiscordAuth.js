import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ROLES } from "../lib/auth";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const backend = (import.meta.env.VITE_DATA_BACKEND || "").trim().toLowerCase();

function getDiscordIdentity(user) {
  return user?.identities?.find((identity) => identity.provider === "discord") || null;
}

function getDiscordId(user) {
  const identity = getDiscordIdentity(user);
  const data = identity?.identity_data || {};
  return String(data.sub || data.provider_id || data.id || "").trim();
}

function getDisplayName(user) {
  const metadata = user?.user_metadata || {};
  return metadata.global_name || metadata.full_name || metadata.name || metadata.preferred_username || user?.email || "Discord user";
}

function getAvatarUrl(user) {
  const metadata = user?.user_metadata || {};
  return metadata.avatar_url || metadata.picture || "";
}

export function useDiscordAuth(enabled = false) {
  const useLiveAuth = Boolean(enabled && isSupabaseConfigured && backend === "supabase" && supabase);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(ROLES.guest);
  const [authLoading, setAuthLoading] = useState(Boolean(useLiveAuth));
  const [authError, setAuthError] = useState("");
  const hasResolvedInitialAuth = useRef(!useLiveAuth);

  const resolveRole = useCallback(async (nextSession = null, options = {}) => {
    const background = Boolean(options.background || hasResolvedInitialAuth.current);
    if (!useLiveAuth) {
      setSession(null);
      setUser(null);
      setRole(ROLES.guest);
      setAuthLoading(false);
      setAuthError("");
      hasResolvedInitialAuth.current = true;
      return;
    }

    if (!background) setAuthLoading(true);
    setAuthError("");

    try {
      const activeSession = nextSession || (await supabase.auth.getSession()).data.session;
      setSession(activeSession);

      if (!activeSession) {
        setUser(null);
        setRole(ROLES.guest);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const activeUser = userError ? activeSession.user : userData?.user || activeSession.user;
      setUser(activeUser);

      const discordId = getDiscordId(activeUser);
      if (!discordId) {
        setAuthError("Discord identity was not available. Member access is active.");
        setRole((currentRole) => (currentRole === ROLES.officer ? currentRole : ROLES.member));
        return;
      }

      const { data, error } = await supabase
        .from("officer_allowlist")
        .select("discord_id")
        .eq("discord_id", discordId)
        .maybeSingle();

      if (error) {
        setAuthError("Officer verification unavailable. Member access is active.");
        setRole((currentRole) => (currentRole === ROLES.officer ? currentRole : ROLES.member));
        return;
      }

      setRole(data ? ROLES.officer : ROLES.member);
    } catch (error) {
      setAuthError(error?.message || "Authentication check failed.");
      if (!nextSession) setRole(ROLES.guest);
    } finally {
      hasResolvedInitialAuth.current = true;
      if (!background) setAuthLoading(false);
    }
  }, [useLiveAuth]);

  useEffect(() => {
    resolveRole();
  }, [resolveRole]);

  useEffect(() => {
    if (!useLiveAuth) return undefined;

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setUser(null);
        setRole(ROLES.guest);
        setAuthLoading(false);
      } else {
        setUser(nextSession.user || null);
      }
      setTimeout(() => {
        resolveRole(nextSession, { background: true });
      }, 0);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [resolveRole, useLiveAuth]);

  const signInWithDiscord = useCallback(async () => {
    if (!useLiveAuth) return;
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setAuthError(error.message);
  }, [useLiveAuth]);

  const signOut = useCallback(async () => {
    if (!useLiveAuth) return;
    setAuthError("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      return;
    }
    setSession(null);
    setUser(null);
    setRole(ROLES.guest);
  }, [useLiveAuth]);

  return useMemo(() => ({
    session,
    user,
    discordId: getDiscordId(user),
    displayName: user ? getDisplayName(user) : "",
    avatarUrl: getAvatarUrl(user),
    role,
    authLoading,
    authError,
    signInWithDiscord,
    signOut,
    refreshRole: resolveRole
  }), [authError, authLoading, resolveRole, role, session, signInWithDiscord, signOut, user]);
}
