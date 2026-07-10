const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      "import/namespace": "off",
      "import/named": "off",
      "import/default": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",
      "import/no-cycle": "off",
    },
    settings: {
      "import/resolver": {
        node: { extensions: [".js", ".jsx", ".ts", ".tsx"] },
      },
    },
  },
]);
