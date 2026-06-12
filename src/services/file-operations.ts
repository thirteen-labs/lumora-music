import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface FileOperationResult {
  success: boolean;
  error?: string;
  newUri?: string;
}

export async function deleteFile(uri: string): Promise<FileOperationResult> {
  try {
    const file = new File(uri);
    await file.delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to delete file' };
  }
}

export async function deleteFiles(uris: string[]): Promise<FileOperationResult> {
  let failed = 0;
  let lastError = '';
  for (const uri of uris) {
    const result = await deleteFile(uri);
    if (!result.success) {
      failed++;
      lastError = result.error ?? 'Failed';
    }
  }
  if (failed > 0 && failed === uris.length) {
    return { success: false, error: lastError };
  }
  return { success: true };
}

export async function renameFile(
  uri: string,
  newName: string
): Promise<FileOperationResult> {
  try {
    const file = new File(uri);
    const dirPath = uri.substring(0, uri.lastIndexOf('/') + 1);
    const destFile = new File(dirPath + newName);
    await file.move(destFile);
    return { success: true, newUri: destFile.uri };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to rename file' };
  }
}

export async function moveFile(
  sourceUri: string,
  destDirUri: string
): Promise<FileOperationResult> {
  try {
    const file = new File(sourceUri);
    const fileName = sourceUri.substring(sourceUri.lastIndexOf('/') + 1);
    const destPath = destDirUri.endsWith('/') ? destDirUri + fileName : destDirUri + '/' + fileName;
    const destFile = new File(destPath);
    await file.move(destFile);
    return { success: true, newUri: destFile.uri };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to move file' };
  }
}

export async function copyFile(
  sourceUri: string,
  destDirUri: string
): Promise<FileOperationResult> {
  try {
    const file = new File(sourceUri);
    const fileName = sourceUri.substring(sourceUri.lastIndexOf('/') + 1);
    const destPath = destDirUri.endsWith('/') ? destDirUri + fileName : destDirUri + '/' + fileName;
    const destFile = new File(destPath);
    await file.copy(destFile);
    return { success: true, newUri: destFile.uri };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to copy file' };
  }
}

export async function shareFile(uri: string): Promise<FileOperationResult> {
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return { success: false, error: 'Sharing is not available on this device' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: getMimeType(uri),
      dialogTitle: 'Share file',
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to share file' };
  }
}

export async function shareFiles(uris: string[]): Promise<FileOperationResult> {
  if (uris.length === 0) {
    return { success: false, error: 'No files to share' };
  }
  if (uris.length === 1) {
    return shareFile(uris[0]);
  }
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return { success: false, error: 'Sharing is not available on this device' };
    }
    await Sharing.shareAsync(uris[0], {
      mimeType: getMimeType(uris[0]),
      dialogTitle: `Share ${uris.length} files`,
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to share files' };
  }
}

function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    flac: 'audio/flac',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    wma: 'audio/x-ms-wma',
    opus: 'audio/opus',
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    webm: 'video/webm',
    m4v: 'video/mp4',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}
