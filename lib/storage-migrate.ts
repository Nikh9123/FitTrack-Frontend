import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/branding";

type StorageKeyId = keyof typeof STORAGE_KEYS;

/** Read from new key, falling back to legacy FitTrack key and copying forward. */
export async function getStorageItem(keyId: StorageKeyId): Promise<string | null> {
  const current = await AsyncStorage.getItem(STORAGE_KEYS[keyId]);
  if (current != null) return current;

  const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEYS[keyId]);
  if (legacy != null) {
    await AsyncStorage.setItem(STORAGE_KEYS[keyId], legacy);
  }
  return legacy;
}

export async function setStorageItem(keyId: StorageKeyId, value: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS[keyId], value);
}

/** Migrate auth keys from legacy FitTrack storage on app startup. */
export async function migrateAuthStorage(): Promise<void> {
  await Promise.all([getStorageItem("token"), getStorageItem("user")]);
}
