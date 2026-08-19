const { withAndroidManifest } = require('expo/config-plugins');

const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-flac',
  'audio/flac',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/x-aac',
  'audio/x-m4a',
  'audio/amr',
  'audio/x-amr',
  'audio/3gpp',
  'audio/x-ms-wma',
  'audio/webm',
  'audio/x-vorbis+ogg',
  'audio/aiff',
  'audio/x-aiff',
  'audio/basic',
  'audio/L16',
  'audio/ecelp4800',
  'audio/mp2',
  'audio/midi',
  'audio/x-midi',
];

function buildIntentFilter() {
  const data = AUDIO_MIME_TYPES.map((mime) => ({ $: { 'android:mimeType': mime } }));
  return {
    action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
    category: [
      { $: { 'android:name': 'android.intent.category.DEFAULT' } },
      { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
    ],
    data,
  };
}

module.exports = function withMusicPlayerIntents(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const pkg = config.android?.package ?? 'com.cadmuslabss.lumora';

    if (!manifest.application) {
      manifest.application = [{ $: { 'android:name': pkg + '.MainApplication' } }];
    }

    const app = manifest.application[0];

    if (!app.activity) {
      app.activity = [];
    }

    const mainActivity = app.activity.find(
      (a) => a.$?.['android:name']?.includes('.MainActivity')
    );

    if (!mainActivity) {
      return config;
    }

    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }

    const alreadyHasAudioFilter = mainActivity['intent-filter'].some((f) => {
      const data = f.data;
      if (!data || !Array.isArray(data)) return false;
      return data.some((d) => d.$?.['android:mimeType']?.startsWith('audio/'));
    });

    if (!alreadyHasAudioFilter) {
      mainActivity['intent-filter'].push(buildIntentFilter());
    }

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const perms = manifest['uses-permission'].map((p) => p.$?.['android:name']);
    if (!perms.includes('android.permission.READ_EXTERNAL_STORAGE')) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.READ_EXTERNAL_STORAGE' },
      });
    }
    if (!perms.includes('android.permission.READ_MEDIA_AUDIO')) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.READ_MEDIA_AUDIO' },
      });
    }

    return config;
  });
};
