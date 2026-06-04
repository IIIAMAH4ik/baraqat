import * as SecureStore from "expo-secure-store";
import { base64DecodeToString } from "@/lib/base64";

const FUNCTIONS_URL = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL!;

/**
 * Makes an authenticated API call to the Cloudflare Worker.
 * Automatically attaches the user's JWT as X-Rork-User-Id header.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Attach user ID from JWT for worker auth
  const token = await SecureStore.getItemAsync("access_token");
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(base64DecodeToString(parts[1]));
        if (payload.sub) {
          headers["X-Rork-User-Id"] = payload.sub;
        }
      }
    } catch {
      // Token decode failed, proceed without user header
    }
  }

  const res = await fetch(`${FUNCTIONS_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, (errBody as { error?: string }).error || "API error");
  }

  return res.json();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
