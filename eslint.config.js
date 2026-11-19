import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  includeIgnoreFile(fileURLToPath(new URL(".gitignore", import.meta.url)), "Imported .gitignore patterns"),
  {
    // Not in .gitignore: generated, vendored or tool-owned files.
    ignores: [
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
  {
    rules: {
      eqeqeq: ["error", "smart"],
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      // `!!x` stays allowed: unlike Boolean(x) it narrows in TypeScript (`!!a?.b && a.b`).
      "no-implicit-coercion": ["error", { allow: ["!!"] }],
      "no-useless-rename": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Arrow shorthand like `onClick={() => setOpen(false)}` is idiomatic in JSX handlers.
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      // `a || b` on strings, numbers and booleans deliberately treats "", 0 and false as missing; `??` would not.
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true, number: true, boolean: true } },
      ],
      // React ignores the value a handler returns, and tests await the promise an async handler returns.
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      // Numbers in template strings are safe and common (`${count} items`).
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    // Plain JS files are not in any tsconfig project, so type-aware rules cannot run on them.
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    rules: {
      // Vite preset options plus the helpers and hooks that deliberately live next to a component or provider
      // (shadcn variants, context hooks, query helpers). Hot reload then does a full reload for these files only.
      "react-refresh/only-export-components": [
        "error",
        {
          allowConstantExport: true,
          allowCompoundComponents: true,
          allowExportNames: [
            "TABS",
            "pillColumn",
            "toPeople",
            "badgeVariants",
            "buttonVariants",
            "tabsListVariants",
            "toggleVariants",
            "toast",
            "useI18n",
            "apiData",
            "isFailed",
            "createServerQueryClient",
            "refreshServerData",
            "refreshForPush",
            "useQuerySignOut",
            "useServerQuery",
            "apiMutationOptions",
            "useApiMutation",
            "visitTab",
            "useTheme",
          ],
        },
      ],
    },
  },
  {
    // The worker logs through console (Workers observability); log is part of its contract.
    files: ["src/worker/**/*.ts"],
    rules: { "no-console": ["error", { allow: ["log", "warn", "error", "info"] }] },
  },
  {
    // CLI scripts print to stdout by design.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  {
    // Tests mock Cloudflare and browser APIs with loose shapes and assert on values they just set up.
    files: ["test/**"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // asserting on fixtures, a failure is a failed test
      "@typescript-eslint/no-empty-function": "off", // no-op mocks
      "@typescript-eslint/no-explicit-any": "off", // loose mock shapes
      "@typescript-eslint/no-unsafe-argument": "off", // loose mock shapes
      "@typescript-eslint/no-unsafe-assignment": "off", // loose mock shapes
      "@typescript-eslint/no-unsafe-call": "off", // loose mock shapes
      "@typescript-eslint/no-unsafe-member-access": "off", // loose mock shapes
      "@typescript-eslint/no-unsafe-return": "off", // loose mock shapes
      "@typescript-eslint/require-await": "off", // async mocks without await
    },
  },
  prettier,
);
