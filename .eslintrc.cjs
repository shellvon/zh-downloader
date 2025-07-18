module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2020: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended", // Must be last to override other configs
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    project: ["./tsconfig.json", "./tsconfig.node.json"], // Specify project for type-aware linting
  },
  settings: {
    react: {
      version: "detect", // Automatically detect the React version
    },
  },
  plugins: ["react", "react-hooks", "@typescript-eslint", "prettier"],
  rules: {
    "react/react-in-jsx-scope": "off", // Not needed for React 17+ JSX transform
    "@typescript-eslint/no-explicit-any": "off", // Allow 'any' for flexibility, adjust if strictness is needed
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }], // Warn on unused vars, ignore args starting with _
    "prettier/prettier": "warn", // Warn about Prettier issues
    "no-console": ["warn", { allow: ["warn", "error", "info"] }], // Allow console.warn, .error, .info
  },
  ignorePatterns: ["dist/", "node_modules/", "scripts/build-zip.js"], // Ignore build output and specific scripts
};
