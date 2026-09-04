import { getThumbnail, persistThumbnail } from '@/services/thumbnail-cache';
import { reportWarning } from '@/utils/error-handler';

/**
 * Resolves an artwork URI to a local file URI suitable for rendering.
 * Now backed by SQLite+file persistence (thumbnail-cache). Falls back to
 * direct copy for `content://`.
 * - `content://` -> persisted thumb file (durable across restarts)
 * - `file://` / `http(s)://` -> returned as-is
 */
export async function resolveArtworkForDisplay(uri: string): Promise<string | null> {
  if (!uri) return null;
  if (!uri.startsWith('content://')) return uri;

  try {
    const cached = await getThumbnail(uri);
    if (cached) return cached;
    const persisted = await persistThumbnail(uri);
    return persisted ?? null;
  } catch (e) {
    reportWarning('ArtworkResolver', e, `Failed to cache artwork: ${uri}`);
    return null;
  }
}
