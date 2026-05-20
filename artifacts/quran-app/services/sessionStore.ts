import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "madeenan.session-token";

// expo-secure-store uses native keychain APIs that are unavailable on web.
// Fall back to localStorage on web (sessions are not end-to-end encrypted there,
// but this matches what the web platform can provide).
export async function getStoredSessionToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return localStorage.getItem(SESSION_TOKEN_KEY); } catch { return null; }
  }
  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeSessionToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    try { localStorage.setItem(SESSION_TOKEN_KEY, token); } catch {}
    return;
  }
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearStoredSessionToken(): Promise<void> {
  if (Platform.OS === "web") {
    try { localStorage.removeItem(SESSION_TOKEN_KEY); } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch {}
}
