import { installGlobalErrorHandler } from '@/utils/error-handler';
import { checkStorageIntegrity } from '@/services/mmkv';

// Must be first before any other imports
installGlobalErrorHandler();
checkStorageIntegrity();

import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '@/services/playback-service';

TrackPlayer.registerPlaybackService(() => PlaybackService);

import 'expo-router/entry';
