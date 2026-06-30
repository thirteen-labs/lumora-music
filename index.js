import { installGlobalErrorHandler } from '@/utils/error-handler';
import { checkStorageIntegrity } from '@/services/mmkv';

// Must be first before any other imports
installGlobalErrorHandler();
checkStorageIntegrity();

import 'expo-router/entry';
