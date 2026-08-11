import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { storage } from "@/services/mmkv";
import { logger } from "@/utils/logger";
import type { CloudProvider, CloudFile, TokenSet } from "./types";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "lumora-dropbox-token";
const API_HOST = "https://api.dropboxapi.com";
const CONTENT_HOST = "https://content.dropboxapi.com";
const BACKUP_DIR = "/.lumora-backups";

const discovery = {
  authorizationEndpoint: "https://www.dropbox.com/oauth2/authorize",
  tokenEndpoint: "https://api.dropboxapi.com/oauth2/token",
  revocationEndpoint: "https://api.dropboxapi.com/oauth2/revoke",
};

function loadToken(): TokenSet | null {
  try {
    const raw = storage.getString(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToken(token: TokenSet | null): void {
  try {
    if (token) {
      storage.set(TOKEN_KEY, JSON.stringify(token));
    } else {
      storage.remove(TOKEN_KEY);
    }
  } catch (e) { logger.warn('Failed to save Dropbox token:', e); }
}

function isTokenValid(token: TokenSet): boolean {
  if (!token.expiryDate) return true;
  return Date.now() < token.expiryDate - 60000;
}

async function ensureBackupDir(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_HOST}/2/files/get_metadata`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: BACKUP_DIR }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function createBackupDir(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_HOST}/2/files/create_folder_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: BACKUP_DIR, autorename: false }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function createDropboxProvider(appKey: string): CloudProvider {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "lumora",
  });

  const provider: CloudProvider = {
    id: "dropbox",
    name: "Dropbox",
    color: "#0061FF",

    isConnected(): boolean {
      const token = loadToken();
      return token !== null && isTokenValid(token);
    },

    async authorize(): Promise<boolean> {
      try {
        const token = loadToken();
        if (token && isTokenValid(token)) return true;

        const authRequest = new AuthSession.AuthRequest({
          clientId: appKey,
          scopes: [],
          redirectUri,
          usePKCE: false,
          extraParams: {
            token_access_type: "offline",
          },
        });

        const result = await authRequest.promptAsync(discovery);

        if (result.type !== "success" || !result.params.code) {
          return false;
        }

        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            code: result.params.code,
            clientId: appKey,
            redirectUri,
          },
          discovery,
        );

        const tokenSet: TokenSet = {
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken || undefined,
          expiryDate: tokenResult.expiresIn
            ? Date.now() + tokenResult.expiresIn * 1000
            : undefined,
        };

        saveToken(tokenSet);
        return true;
      } catch {
        return false;
      }
    },

    async uploadBackup(json: string, fileName: string): Promise<boolean> {
      try {
        const token = loadToken();
        if (!token) return false;

        const dirExists = await ensureBackupDir(token.accessToken);
        if (!dirExists) {
          await createBackupDir(token.accessToken);
        }

        const path = `${BACKUP_DIR}/${fileName}`;
        const response = await fetch(`${CONTENT_HOST}/2/files/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({
              path,
              mode: "overwrite",
              autorename: false,
              mute: true,
            }),
          },
          body: json,
        });

        return response.ok;
      } catch {
        return false;
      }
    },

    async listBackups(): Promise<CloudFile[]> {
      try {
        const token = loadToken();
        if (!token) return [];

        const response = await fetch(`${API_HOST}/2/files/list_folder`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: BACKUP_DIR,
            order_by: "modified_time",
            direction: "desc",
          }),
        });

        if (!response.ok) return [];

        const data = await response.json();
        return (data.entries || [])
          .filter((e: { ".tag"?: string; name: string; id?: string; path_lower?: string; client_modified?: string; size?: number }) => e[".tag"] === "file" && e.name.startsWith("lumora-backup-"))
          .map((e: { ".tag"?: string; name: string; id?: string; path_lower?: string; client_modified?: string; size?: number }) => ({
            id: e.id || e.path_lower,
            name: e.name,
            createdAt: e.client_modified ? new Date(e.client_modified).getTime() : 0,
            size: e.size || 0,
          }));
      } catch {
        return [];
      }
    },

    async downloadBackup(filePath: string): Promise<string | null> {
      try {
        const token = loadToken();
        if (!token) return null;

        const apiArg = filePath.startsWith("/") ? filePath : `${BACKUP_DIR}/${filePath}`;

        const response = await fetch(`${CONTENT_HOST}/2/files/download`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Dropbox-API-Arg": JSON.stringify({ path: apiArg }),
          },
        });

        if (!response.ok) return null;
        return await response.text();
      } catch {
        return null;
      }
    },

    async revoke(): Promise<void> {
      try {
        const token = loadToken();
        if (token?.accessToken) {
          await fetch(discovery.revocationEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `token=${token.accessToken}`,
          });
        }
      } catch {
      } finally {
        saveToken(null);
      }
    },
  };

  return provider;
}
