import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "dev-dist",
      ".wrangler",
      "coverage",
      "node_modules",
      "migrations",
      "public",
      "test/__snapshots__",
      ".codegraph",
      ".team",
      ".claude",
      ".commandcode",
      "worker-configuration.d.ts",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended],
    rules: {
      // React Compiler diagnostics from react-hooks v7; the app does not use the compiler and these flag
      // working patterns (ref-backed state, Date.now in render, set-state in effects). Keep rules-of-hooks
      // and exhaustive-deps.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    ...reactRefresh.configs.vite,
  },
  {
    // shadcn-generated files export variants next to components. The other modules deliberately pair a
    // provider or component with its hooks and helpers; the rule only affects dev hot reload.
    files: [
      "src/client/components/ui/**",
      "src/client/components/bisou/{AppShell,Celebration,CoupleAvatars}.tsx",
      "src/client/i18n/index.tsx",
      "src/client/lib/serverQuery.tsx",
      "src/client/screens/TabScreens.tsx",
      "src/client/theme/ThemeProvider.tsx",
    ],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["src/worker/**/*.ts", "src/shared/**/*.ts"],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ["scripts/**", "test/**", "*.config.{js,ts,mjs}", ".pnpmfile.cjs"],
    languageOptions: { globals: globals.node },
  },
  {
    // Tests mock Cloudflare and browser APIs with loose shapes.
    files: ["test/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  prettier,
);
