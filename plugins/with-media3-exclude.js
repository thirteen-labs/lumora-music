const {
  withProjectBuildGradle,
  withAppBuildGradle,
} = require('expo/config-plugins');

const MEDIA3_MODULES = [
  'media3-common',
  'media3-database',
  'media3-datasource',
  'media3-exoplayer',
  'media3-extractor',
];

const ROOT_MARKER = 'com.github.MissingCore.media:media3-common';
const APP_MARKER = "exclude group: 'com.github.MissingCore.media', module: 'media3-common'";

module.exports = function withMedia3Exclude(config) {
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(ROOT_MARKER)) {
      return config;
    }

    const substitutions = MEDIA3_MODULES
      .map((m) => `        substitute module('com.github.MissingCore.media:${m}') using module('androidx.media3:${m}:1.9.3')`)
      .join('\n');

    const block = [
      '',
      '  configurations.all {',
      '    resolutionStrategy {',
      '      dependencySubstitution {',
      substitutions,
      '      }',
      '    }',
      '  }',
    ].join('\n');

    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*\{/,
      (match) => match + block,
    );

    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(APP_MARKER)) {
      return config;
    }

    const excludes = MEDIA3_MODULES
      .map((m) => `        exclude group: 'com.github.MissingCore.media', module: '${m}'`)
      .join('\n');

    const block = [
      '',
      '    // Exclude duplicate media3 classes from MissingCore',
      '    configurations.configureEach {',
      excludes,
      '    }',
    ].join('\n');

    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*\{/,
      (match) => match + block,
    );

    return config;
  });

  return config;
};
