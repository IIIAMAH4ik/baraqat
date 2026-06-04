/**
 * Pure JS base64 encode/decode — works in React Native (Hermes) without browser APIs.
 * Handles both standard base64 and base64url variants.
 */

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64Encode(bytes: Uint8Array): string {
  let result = "";
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const a = bytes[i++];
    const b = i < len ? bytes[i++] : 0;
    const c = i < len ? bytes[i++] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    result += CHARS.charAt((triplet >> 18) & 0x3f);
    result += CHARS.charAt((triplet >> 12) & 0x3f);
    result += i - 2 < len ? CHARS.charAt((triplet >> 6) & 0x3f) : "=";
    result += i - 1 < len ? CHARS.charAt(triplet & 0x3f) : "=";
  }
  return result;
}

export function base64Decode(str: string): Uint8Array {
  // Normalize base64url to base64
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if missing
  while (str.length % 4 !== 0) str += "=";

  const bytes: number[] = [];
  for (let i = 0; i < str.length; i += 4) {
    const a = CHARS.indexOf(str[i]);
    const b = CHARS.indexOf(str[i + 1] || "A");
    const c = CHARS.indexOf(str[i + 2] || "A");
    const d = CHARS.indexOf(str[i + 3] || "A");
    bytes.push((a << 2) | (b >> 4));
    if (str[i + 2] !== "=") bytes.push(((b & 0x0f) << 4) | (c >> 2));
    if (str[i + 3] !== "=") bytes.push(((c & 0x03) << 6) | d);
  }
  return new Uint8Array(bytes);
}

/** Decode base64 (or base64url) string to a plain string (e.g. JWT payload) */
export function base64DecodeToString(str: string): string {
  const bytes = base64Decode(str);
  return String.fromCharCode(...bytes);
}
