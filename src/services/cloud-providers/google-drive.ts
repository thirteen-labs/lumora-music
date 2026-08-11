import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { storage } from "@/services/mmkv";
import { logger } from "@/utils/logger";
import type { CloudProvider, CloudFile, TokenSet } from "./types";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "lumora-google-drive-token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const BACKUP_MIME = "application/json";

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
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
  } catch (e) { logger.warn('Failed to save Google Drive token:', e); }
}

function isTokenValid(token: TokenSet): boolean {
  if (!token.expiryDate) return true;
  return Date.now() < token.expiryDate - 60000;
}

export function createGoogleDriveProvider(clientId: string): CloudProvider {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "lumora",
    preferLocalhost: Platform.OS === "web",
  });

  const provider: CloudProvider = {
    id: "google-drive",
    name: "Google Drive",
    color: "#4285F4",

    isConnected(): boolean {
      const token = loadToken();
      return token !== null && isTokenValid(token);
    },

    async authorize(): Promise<boolean> {
      try {
        const token = loadToken();
        if (token && isTokenValid(token)) return true;

        const authRequest = new AuthSession.AuthRequest({
          clientId,
          scopes: SCOPES,
          redirectUri,
          usePKCE: true,
          extraParams: {
            access_type: "offline",
            prompt: "consent",
          },
        });

        const result = await authRequest.promptAsync(discovery);

        if (result.type !== "success" || !result.params.code) {
          return false;
        }

        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            code: result.params.code,
            clientId,
            redirectUri,
            extraParams: {
              code_verifier: authRequest.codeVerifier || "",
            },
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

        const boundary = "foo_bar_baz";
        const delimiter = `\r\n--${boundary}`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = JSON.stringify({
          name: fileName,
          mimeType: BACKUP_MIME,
          parents: ["appDataFolder"],
        });

        const multipartBody =
          delimiter +
          "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
          metadata +
          delimiter +
          "\r\nContent-Type: application/json\r\n\r\n" +
          json +
          closeDelimiter;

        const response = await fetch(
          `${DRIVE_API}/files?uploadType=multipart&supportsAllDrives=true`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              "Content-Type": `multipart/related; boundary=${boundary}`,
              "Content-Length": String(new Blob([multipartBody]).size),
            },
            body: multipartBody,
          },
        );

        return response.ok;
      } catch {
        return false;
      }
    },

    async listBackups(): Promise<CloudFile[]> {
      try {
        const token = loadToken();
        if (!token) return [];

        const query = encodeURIComponent(
          "name contains 'lumora-backup-' and mimeType='application/json' and 'appDataFolder' in parents",
        );

        const response = await fetch(
          `${DRIVE_API}/files?q=${query}&orderBy=createdTime desc&pageSize=20&fields=files(id,name,createdTime,size)`,
          {
            headers: { Authorization: `Bearer ${token.accessToken}` },
          },
        );

        if (!response.ok) return [];

        const data = await response.json();
        return (data.files || []).map((f: { id: string; name: string; createdTime?: string; size?: string }) => ({
          id: f.id,
          name: f.name,
          createdAt: f.createdTime ? new Date(f.createdTime).getTime() : 0,
          size: parseInt(f.size || "0", 10),
        }));
      } catch {
        return [];
      }
    },

    async downloadBackup(fileId: string): Promise<string | null> {
      try {
        const token = loadToken();
        if (!token) return null;

        const response = await fetch(
          `${DRIVE_API}/files/${fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token.accessToken}` },
          },
        );

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
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `token=${token.accessToken}`,
          });
        }
      } catch { /* revoke token failed */ } finally {
        saveToken(null);
      }
    },
  };

  return provider;
}
