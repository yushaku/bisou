import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

// Plain `.name { }` rules in the global CSS (garden scene, jar, envelope...) are not Tailwind utilities.
// The plugin only detects component classes inside `@layer components`, so list them from the CSS itself.
const cssDir = new URL("src/client/", import.meta.url);
const customCssClasses = [
  ...new Set(
    ["styles.css", ...readdirSync(new URL("theme/", cssDir)).map((f) => `theme/${f}`)]
      .filter((f) => f.endsWith(".css"))
      .flatMap(
        (f) => readFileSync(new URL(f, cssDir), "utf8").match(/(?<=\.)[A-Za-z_][\w-]*(?=[\s.,:{[>+~)#]|$)/gm) ?? [],
      ),
  ),
];

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
    // Tailwind classes: styles.css is the only source of colors, radii, fonts and type scale (see ./src/client/styles.css).
    // Prettier owns line wrapping, so enforce-consistent-line-wrapping stays off.
    files: ["src/client/**/*.{ts,tsx}"],
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/client/styles.css",
      },
    },
    rules: {
      "better-tailwindcss/no-unknown-classes": [
        "error",
        {
          // Plain CSS classes, plus marker classes without styles that tests query (test/notes-client.test.ts).
          ignore: [`^(?:${[...customCssClasses, "note-postmark", "note-preview", "note-metadata"].join("|")})$`],
        },
      ],
      "better-tailwindcss/no-conflicting-classes": "error",
      "better-tailwindcss/no-duplicate-classes": "error",
      "better-tailwindcss/no-deprecated-classes": "error",
      "better-tailwindcss/no-unnecessary-whitespace": "error",
      "better-tailwindcss/no-concatenated-classes": "error",
      "better-tailwindcss/enforce-consistent-class-order": "error",
      "better-tailwindcss/enforce-canonical-classes": "error",
      "better-tailwindcss/enforce-shorthand-classes": "error",
      "better-tailwindcss/enforce-consistent-variable-syntax": "error",
      "better-tailwindcss/enforce-consistent-important-position": "error",
      "better-tailwindcss/enforce-consistent-variant-order": "error",
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      // Would rewrite w/h/size/min-h to inline/block axes (811 hits). The app is LTR only, so it buys nothing.
      "better-tailwindcss/enforce-logical-properties": "off",
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            {
              pattern: String.raw`(?:^|:)!?-?(?:bg|text|fill|stroke|from|via|to|decoration|accent|caret|divide|placeholder|outline|shadow|rounded(?:-[a-z]{1,2})?|font|tracking|leading)-(?:\[|\()`,
              message:
                "Arbitrary value: use a token class from src/client/styles.css (add the token there if none fits).",
            },
            {
              pattern: String.raw`(?:^|:)!?-?(?:border(?:-[xytblrse])?|ring|ring-offset)-(?:\[(?!\d)|\()`,
              message: "Arbitrary color: use a token class from src/client/styles.css.",
            },
            {
              pattern: String.raw`\/\[`,
              message: "Arbitrary opacity: use a numeric step such as /10.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/worker/**"],
    rules: { "no-console": ["error", {}] },
  },
  {
    files: ["src/worker/lib/logger.ts"],
    rules: { "no-console": "off" },
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
