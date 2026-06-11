const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SUBSTITUTION_MARKER = "substitute module('com.github.MissingCore.media:media3-extractor')";

module.exports = function withMedia3Exclude(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'build.gradle'
      );

      let content = fs.readFileSync(buildGradlePath, 'utf-8');

      if (content.includes(SUBSTITUTION_MARKER)) {
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

      const block = [
        '',
        '  configurations.all {',
        '    resolutionStrategy {',
        "      dependencySubstitution {",
        "        substitute module('com.github.MissingCore.media:media3-extractor') using module('androidx.media3:media3-extractor:1.9.3')",
        "      }",
        '    }',
        '  }',
      ].join('\n');

      content =
        content.slice(0, endIndex) + block + '\n' + content.slice(endIndex);

      fs.writeFileSync(buildGradlePath, content, 'utf-8');

      return config;
    },
  ]);
};
