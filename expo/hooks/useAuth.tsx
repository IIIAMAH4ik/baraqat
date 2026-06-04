import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  phone?: string | null;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;

  signUp: (params: {
    email: string;
    password: string;
    name?: string;
    phone?: string;
  }) => Promise<void>;

  signInWithPassword: (params: {
    email: string;
    password: string;
  }) => Promise<void>;

  signIn: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapAuthUserToUser(authUser: Session["user"], profile?: any): User {
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name:
      profile?.name ??
      authUser.user_metadata?.full_name ??
      authUser.user_metadata?.name ??
      null,
    picture:
      profile?.avatar_url ??
      authUser.user_metadata?.avatar_url ??
      authUser.user_metadata?.picture ??
      null,
    phone: profile?.phone ?? null,
    role: profile?.role ?? "client",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    setError(null);
  }

  useEffect(() => {
    loadSession();

    const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (!newSession?.user) {
        setUser(null);
        return;
      }

      await loadUserProfile(newSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function loadSession() {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      setSession(data.session);

      if (data.session?.user) {
        await loadUserProfile(data.session);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth session load failed:", err);
      setError(err instanceof Error ? err.message : "Не удалось загрузить сессию");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUserProfile(currentSession: Session) {
    const authUser = currentSession.user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,name,phone,avatar_url,role")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile load failed:", profileError);
    }

    setUser(mapAuthUserToUser(authUser, profile));
  }

  async function signUp(params: {
    email: string;
    password: string;
    name?: string;
    phone?: string;
  }) {
    setIsSigningIn(true);
    setError(null);

    try {
      const email = params.email.trim().toLowerCase();

      if (!email) {
        throw new Error("Введите email");
      }

      if (!params.password || params.password.length < 6) {
        throw new Error("Пароль должен быть минимум 6 символов");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: params.password,
        options: {
          data: {
            name: params.name?.trim() || null,
            full_name: params.name?.trim() || null,
            phone: params.phone?.trim() || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session?.user) {
        setSession(data.session);
        await loadUserProfile(data.session);
      }
    } catch (err) {
      console.error("Sign up failed:", err);
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signInWithPassword(params: {
    email: string;
    password: string;
  }) {
    setIsSigningIn(true);
    setError(null);

    try {
      const email = params.email.trim().toLowerCase();

      if (!email) {
        throw new Error("Введите email");
      }

      if (!params.password) {
        throw new Error("Введите пароль");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: params.password,
      });

      if (error) {
        throw error;
      }

      if (data.session?.user) {
        setSession(data.session);
        await loadUserProfile(data.session);
      }
    } catch (err) {
      console.error("Sign in failed:", err);
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signIn(provider: "google" | "apple") {
    setError(
      provider === "google"
        ? "Google-вход подключим отдельно через Supabase OAuth."
        : "Apple-вход пока не подключён."
    );
  }

  async function signOut() {
    setError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      return;
    }

    setSession(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isSigningIn,
        error,
        signUp,
        signInWithPassword,
        signIn,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}