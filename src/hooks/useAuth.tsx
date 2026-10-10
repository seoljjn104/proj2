"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isAllowedEmailDomain, allowedDomainsHint } from "@/lib/email-domains";
import type { Profile } from "@/types/database";

/** Maps raw Supabase auth errors to plain language. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) {
    return "An account with this email already exists.";
  }
  if (m.includes("password should be at least")) {
    return "Password is too short. Use at least 8 characters.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first. Check your inbox for the link.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Something went wrong. Please try again.";
}

interface SignUpResult {
  error: string | null;
  /** True when Supabase requires email confirmation before login. */
  needsConfirmation: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      setProfile((data as Profile | null) ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) await loadProfile(u.id);
      if (!cancelled) setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        void loadProfile(u.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!isAllowedEmailDomain(email)) {
        const hint = allowedDomainsHint();
        return hint
          ? `Only these institutional domains can sign in: ${hint}`
          : "This email domain is not allowed.";
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        return error.message === "Invalid login credentials"
          ? "Invalid email or password."
          : friendlyAuthError(error.message);
      }
      router.refresh();
      return null;
    },
    [supabase, router],
  );

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<SignUpResult> => {
      if (name.trim().length < 2) {
        return { error: "Please enter your name.", needsConfirmation: false };
      }
      if (!isAllowedEmailDomain(email)) {
        const hint = allowedDomainsHint();
        return {
          error: hint
            ? `Signups are restricted to these institutional domains: ${hint}`
            : "This email domain is not allowed.",
          needsConfirmation: false,
        };
      }
      if (password.length < 8) {
        return {
          error: "Password must be at least 8 characters.",
          needsConfirmation: false,
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) return { error: friendlyAuthError(error.message), needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile?.is_admin === true,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
