import type { CloudProvider } from "./types";
import { createGoogleDriveProvider } from "./google-drive";
import { createDropboxProvider } from "./dropbox";
import { storage } from "@/services/mmkv";

const GOOGLE_CLIENT_ID_KEY = "lumora-google-drive-client-id";
const DROPBOX_APP_KEY_KEY = "lumora-dropbox-app-key";

let _providers: CloudProvider[] | null = null;

function getStoredGoogleClientId(): string {
  try {
    return storage.getString(GOOGLE_CLIENT_ID_KEY) ?? "";
  } catch {
    return "";
  }
}

function getStoredDropboxAppKey(): string {
  try {
    return storage.getString(DROPBOX_APP_KEY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setGoogleClientId(clientId: string): void {
  try {
    storage.set(GOOGLE_CLIENT_ID_KEY, clientId);
  } catch {}
  _providers = null;
}

export function setDropboxAppKey(appKey: string): void {
  try {
    storage.set(DROPBOX_APP_KEY_KEY, appKey);
  } catch {}
  _providers = null;
}

export function getGoogleClientId(): string {
  return getStoredGoogleClientId();
}

export function getDropboxAppKey(): string {
  return getStoredDropboxAppKey();
}

export function hasGoogleCredentials(): boolean {
  return getStoredGoogleClientId().length > 0;
}

export function hasDropboxCredentials(): boolean {
  return getStoredDropboxAppKey().length > 0;
}

export function getProviders(): CloudProvider[] {
  if (_providers) return _providers;

  const list: CloudProvider[] = [];

  const googleClientId = getStoredGoogleClientId();
  if (googleClientId) {
    list.push(createGoogleDriveProvider(googleClientId));
  }

  const dropboxAppKey = getStoredDropboxAppKey();
  if (dropboxAppKey) {
    list.push(createDropboxProvider(dropboxAppKey));
  }

  _providers = list;
  return list;
}

export function refreshProviders(): void {
  _providers = null;
}

export { type CloudProvider, type CloudFile, type TokenSet } from "./types";
