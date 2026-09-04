import { checkStorageIntegrity } from '@/services/mmkv';

// Initialize obsidian-media-player playback service
import { PlaybackService } from '@/services/playback-service';
PlaybackService();

import 'expo-router/entry';