const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const EXCLUDE_MARKER = "exclude group: 'com.github.MissingCore.media', module: 'media3-extractor'";

module.exports = function withMedia3Exclude(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'build.gradle'
      );

      let content = fs.readFileSync(buildGradlePath, 'utf-8');

      if (content.includes(EXCLUDE_MARKER)) {
        return config;
      }

      const allprojectsIndex = content.indexOf('allprojects {');
      if (allprojectsIndex === -1) return config;

      let depth = 0;
      let endIndex = -1;
      for (let i = allprojectsIndex; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex === -1) return config;

      const excludeBlock = [
        '',
        '  configurations.all {',
        "    exclude group: 'com.github.MissingCore.media', module: 'media3-extractor'",
        '  }',
      ].join('\n');

      content =
        content.slice(0, endIndex) + excludeBlock + '\n' + content.slice(endIndex);

      fs.writeFileSync(buildGradlePath, content, 'utf-8');

      return config;
    },
  ]);
};
