import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { STORAGE_KEYS } from "@/constants/branding";

export async function loadLocalAvatarUri(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.profileAvatarLocal);
  } catch {
    return null;
  }
}

export async function saveLocalAvatarUri(uri: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.profileAvatarLocal, uri);
}

export async function clearLocalAvatarUri(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.profileAvatarLocal);
}

export async function pickProfilePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  const uri = result.assets[0].uri;
  await saveLocalAvatarUri(uri);
  return uri;
}
