import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_STORAGE_PREFIXES = ["quran_", "madeenan:", "@squran/"];

export async function clearAppOwnedAsyncStorage(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter((key) => APP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)));
  if (appKeys.length > 0) {
    await AsyncStorage.multiRemove(appKeys);
  }
}
