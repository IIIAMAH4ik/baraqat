import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { base64Encode, base64DecodeToString } from "@/lib/base64";
import { supabase } from "@/lib/supabase";

const AUTH_URL = process.env.EXPO_PUBLIC_RORK_AUTH_URL!;
const APP_KEY = process.env.EXPO_PUBLIC_RORK_APP_KEY!;
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID!;

function generateCodeVerifier(): string {
  const bytes = Crypto.getRandomBytes(32);
  return base64Encode(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier
  );
  // digestStringAsync returns a hex string; convert to base64url
  const bytes = hexToBytes(hash);
  return base64Encode(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  phone?: string;
  role?: string;
}

function userFromToken(token: string): User | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64DecodeToString(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return {
      id: payload.sub,
      email: payload.email ?? "",
      name: payload.name,
      picture: payload.picture,
      role: payload.role ?? "customer",
    };
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeVerifierRef = useRef<string | null>(null);

  function clearError() { setError(null); }

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, []);

  async function checkAuth() {
    try {
      const accessToken = await SecureStore.getItemAsync("access_token");
      if (!accessToken) {
        const refreshTokenStored = await SecureStore.getItemAsync("refresh_token");
        if (refreshTokenStored) await refreshToken();
        setIsLoading(false);
        return;
      }
      const decoded = userFromToken(accessToken);
      if (decoded) {
        setUser(decoded);
        await syncProfile(decoded);
      } else {
        await refreshToken();
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeepLink(event: { url: string }) {
    try {
      const url = new URL(event.url);
      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        if (code) await exchangeCode(code);
      }
    } catch (err) {
      console.error("Deep link handling failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  async function syncProfile(u: User) {
    try {
      const { data: existingProfile } = await supabase.from("profiles").select("role,name,phone").eq("id", u.id).maybeSingle();
      const profileData = {
        id: u.id,
        email: u.email,
        name: u.name || (existingProfile as Record<string, unknown> | null)?.name || null,
        avatar_url: u.picture || null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("profiles").upsert(profileData, { onConflict: "id" });

      // Propagate role from DB profile to in-memory user object (for admin checks)
      const dbRole = (existingProfile as Record<string, unknown> | null)?.role as string | undefined;
      if (dbRole && dbRole !== "customer") {
        setUser((prev) => prev ? { ...prev, role: dbRole } : prev);
      }

      // Ensure loyalty_points row exists for the user
      const { data: existing } = await supabase.from("loyalty_points").select("id").eq("user_id", u.id).maybeSingle();
      if (!existing) {
        await supabase.from("loyalty_points").insert({
          user_id: u.id, points: 0, tier: "bronze", total_earned: 0, total_spent: 0,
        });
      }
    } catch (e) {
      // Profile sync is best-effort
    }
  }

  async function signIn(provider: "google" | "apple") {
    setIsSigningIn(true);
    setError(null);
    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      codeVerifierRef.current = verifier;

      const isWeb = Platform.OS === "web";
      const target = "rn";
      const env = isWeb ? "preview" : "native";

      const response = await fetch(`${AUTH_URL}/oauth/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, provider, code_challenge: challenge, target, env }),
      });

      if (!response.ok) {
        codeVerifierRef.current = null;
        const body = await response.json().catch(() => ({}));
        setError(body.error || `Sign in failed (${response.status})`);
        return;
      }

      const { auth_url } = await response.json();

      if (isWeb) {
        const popup = window.open(auth_url, "_blank", "width=500,height=650");
        await new Promise<void>((resolve, reject) => {
          const onMessage = (event: MessageEvent) => {
            if (event.data?.type !== "rork_auth_callback") return;
            window.removeEventListener("message", onMessage);
            clearInterval(pollTimer);
            const code = event.data.code;
            if (code) exchangeCode(code).then(resolve, reject);
            else reject(new Error("No code received"));
          };
          window.addEventListener("message", onMessage);
          const pollTimer = setInterval(() => {
            if (popup?.closed) {
              clearInterval(pollTimer);
              window.removeEventListener("message", onMessage);
              codeVerifierRef.current = null;
              resolve();
            }
          }, 500);
        });
      } else {
        const result = await WebBrowser.openAuthSessionAsync(auth_url, `rork-${PROJECT_ID}://auth/callback`);
        if (result.type === "success") {
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          if (code) await exchangeCode(code);
        }
      }
    } catch (err) {
      console.error("Sign in failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function exchangeCode(code: string) {
    const verifier = codeVerifierRef.current;
    if (!verifier) return;
    codeVerifierRef.current = null;

    const response = await fetch(`${AUTH_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || `Token exchange failed (${response.status})`);
      return;
    }

    const { access_token, refresh_token, user: userData } = await response.json();
    await SecureStore.setItemAsync("access_token", access_token);
    await SecureStore.setItemAsync("refresh_token", refresh_token);
    setUser(userData);
    await syncProfile(userData);
  }

  async function refreshToken() {
    const storedRefreshToken = await SecureStore.getItemAsync("refresh_token");
    if (!storedRefreshToken) { setUser(null); return; }

    const response = await fetch(`${AUTH_URL}/oauth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_key: APP_KEY, refresh_token: storedRefreshToken }),
    });

    if (!response.ok) { await signOut(); return; }

    const { access_token } = await response.json();
    await SecureStore.setItemAsync("access_token", access_token);
    const decoded = userFromToken(access_token);
    if (decoded) { setUser(decoded); await syncProfile(decoded); }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isSigningIn, error, signIn, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
