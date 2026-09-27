#!/usr/bin/env node
/**
 * Wires the Expo-generated android/app/build.gradle to the CI release keystore.
 *
 * Run after `expo prebuild`, because prebuild regenerates build.gradle.
 *
 * The Expo template ships:
 *   signingConfigs { debug { ... } }        <- no release config
 *   buildTypes     { release { signingConfig signingConfigs.debug } }   <- template default
 *
 * Simply adding a `release` signing config is NOT enough: buildTypes.release keeps
 * pointing at signingConfigs.debug, so the APK gets signed with the well-known
 * debug key (debug.keystore / "android" / androiddebugkey) while looking like a
 * real release build. This script does both halves and fails loudly if either
 * half cannot be applied, instead of silently producing a debug-signed APK.
 *
 * Secrets come from the environment so they are never interpolated into a shell
 * string or a JS source literal.
 */
const fs = require('fs');
const path = require('path');

const GRADLE = path.join('android', 'app', 'build.gradle');

const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
const keyPassword = process.env.ANDROID_KEY_PASSWORD;
const keyAlias = process.env.ANDROID_KEY_ALIAS || 'lumora';
const storeFile = process.env.ANDROID_KEYSTORE_FILE || 'release.keystore';

const fail = (msg) => {
  console.error(`patch-release-signing: ${msg}`);
  process.exit(1);
};

if (!storePassword || !keyPassword) {
  fail('ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_PASSWORD must be set');
}

if (!fs.existsSync(GRADLE)) {
  fail(`${GRADLE} not found - did you run \`expo prebuild\` first?`);
}

let content = fs.readFileSync(GRADLE, 'utf8');

// --- 1. Declare a `release` signing config -----------------------------------
if (/^\s*release\s*\{[\s\S]*?storeFile\s+file\('release\.keystore'\)/m.test(content)) {
  console.log('patch-release-signing: release signingConfig already present, skipping insert');
} else {
  const signingConfigsOpen = /^[ \t]*signingConfigs\s*\{/m;
  if (!signingConfigsOpen.test(content)) {
    fail('no `signingConfigs {` block found - Expo template layout changed?');
  }
  const releaseConfig = [
    '    release {',
    `        storeFile file('${storeFile}')`,
    `        storePassword '${storePassword}'`,
    `        keyAlias '${keyAlias}'`,
    `        keyPassword '${keyPassword}'`,
    '    }',
  ].join('\n');
  content = content.replace(signingConfigsOpen, (m) => `${m}\n${releaseConfig}`);
  console.log('patch-release-signing: inserted release signingConfig');
}

// --- 2. Point buildTypes.release at it ----------------------------------------
// The debug build type also uses `signingConfig signingConfigs.debug`, and it is
// declared *before* release, so the last occurrence is the one we want.
const needle = 'signingConfig signingConfigs.debug';
const occurrences = content.split(needle).length - 1;
if (occurrences === 0) {
  fail('no `signingConfig signingConfigs.debug` found in buildTypes');
}
const idx = content.lastIndexOf(needle);
content = content.slice(0, idx) + 'signingConfig signingConfigs.release' + content.slice(idx + needle.length);
console.log(`patch-release-signing: rewired buildTypes.release (${occurrences} candidate(s))`);

fs.writeFileSync(GRADLE, content);

// --- 3. Verify the result rather than trusting the regexes -------------------
const final = fs.readFileSync(GRADLE, 'utf8');
const buildTypesIdx = final.indexOf('buildTypes {');
if (buildTypesIdx === -1) fail('post-check: buildTypes block vanished');

const releaseIdx = final.indexOf('release {', buildTypesIdx);
if (releaseIdx === -1) fail('post-check: release build type not found');

const releaseBlock = final.slice(releaseIdx, final.indexOf('\n    }', releaseIdx));
if (!/signingConfig\s+signingConfigs\.release/.test(releaseBlock)) {
  fail('post-check: buildTypes.release is not using signingConfigs.release');
}
if (/signingConfig\s+signingConfigs\.debug/.test(releaseBlock)) {
  fail('post-check: buildTypes.release still references signingConfigs.debug');
}

console.log('patch-release-signing: OK - release build is signed with the CI keystore');
