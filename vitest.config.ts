import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
  const clientTests = ["test/install.test.ts", "test/theme-provider.test.ts", "test/app-resilience.test.ts", "test/money-controls.test.ts", "test/offline-actions.test.ts", "test/use-wish-jar.test.ts", "test/home-jars-screens.test.ts", "test/update-reload.test.ts"];
  return {
    resolve: { alias: { "@": path.join(import.meta.dirname, "src/client") } },
    test: { projects: [
      { test: { name: "client", include: clientTests, environment: "node" } },
      {
        plugins: [
          cloudflareTest({
            main: "./src/worker/index.ts",
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                ENVIRONMENT: "test",
                OTP_PEPPER: "test-pepper",
                RESEND_API_KEY: "re_test_placeholder",
                TEST_MIGRATIONS: migrations,
              },
            },
          }),
        ],
        test: {
          name: "worker",
          include: ["test/**/*.test.ts"],
          exclude: clientTests,
          setupFiles: ["./test/apply-migrations.ts"],
        },
      },
    ] },
  };
});
