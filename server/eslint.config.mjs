import js from "@eslint/js";
import globals from "globals";

export default [
  // 1. Tell ESLint what to ignore (MUST BE FIRST)
  {
    ignores: ["node_modules/**", "venv/**", "dist/**", "eslint.config.mjs"]
  },
  // 2. Load the recommended JavaScript rules
  js.configs.recommended,
  // 3. Define your custom settings
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs", 
      globals: {
        ...globals.node // Enables Node.js globals like 'process' and 'require'
      },
    },
    rules: {
      "no-unused-vars": "warn", // Fixed the typo here
      "no-console": "off",      // Usually okay for backends
      "no-undef": "error"
    },
  },
];