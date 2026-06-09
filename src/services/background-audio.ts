let isInitialized = false;

export async function setupBackgroundAudio(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;
}
