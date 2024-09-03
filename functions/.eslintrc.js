module.exports = {
    root: true,
    env: {
      es6: true,
      node: true,
    },
    extends: [
      "eslint:recommended",
      "plugin:import/errors",
      "plugin:import/warnings",
      "plugin:import/typescript",
      "google",
      "plugin:@typescript-eslint/recommended",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
      project: ["tsconfig.json", "tsconfig.dev.json"],
      sourceType: "module",
    },
    ignorePatterns: [
      "/lib/**/*", // Ignore built files.
      "/generated/**/*", // Ignore generated files.
    ],
    plugins: [
      "@typescript-eslint",
      "import",
    ],
    rules: {
      "quotes": ["warn", "double"], // Change "error" to "warn"
      "import/no-unresolved": "warn", // Change to "warn"
      "indent": ["warn", 2], // Change "error" to "warn"
      "max-len": ["warn", {"code": 80}], // If you want to add max-len as a warning
      "no-trailing-spaces": "off", // Disables the rule about trailing spaces
      "object-curly-spacing": ["warn", "always"], // Change "error" to "warn"
    },
  };
  
