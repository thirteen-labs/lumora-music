export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

export interface CloudFile {
  id: string;
  name: string;
  createdAt: number;
  size: number;
}

export interface CloudProvider {
  readonly id: string;
  readonly name: string;
  readonly color: string;

  isConnected(): boolean;
  authorize(): Promise<boolean>;
  uploadBackup(json: string, fileName: string): Promise<boolean>;
  listBackups(): Promise<CloudFile[]>;
  downloadBackup(fileId: string): Promise<string | null>;
  revoke(): Promise<void>;
}

export interface ProviderConfig {
  clientId: string;
  redirectUri: string;
}
