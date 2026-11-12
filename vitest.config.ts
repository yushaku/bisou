import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
  const clientTests = ["test/mascot-interactions.test.ts", "test/mascots.test.ts", "test/photo-picker.test.ts", "test/app-sign-out.test.ts", "test/card-box-client.test.ts", "test/app-shell-pull-to-refresh.test.ts", "test/journal-create.test.ts", "test/notes-client.test.ts", "test/garden-client.test.ts", "test/garden-interactions.test.ts", "test/detail-sheets.test.ts", "test/notification-card.test.ts", "test/push-sw.test.ts", "test/push-client.test.ts", "test/notifications.test.ts", "test/install.test.ts", "test/theme-provider.test.ts", "test/app-resilience.test.ts", "test/money-controls.test.ts", "test/offline-actions.test.ts", "test/use-wish-jar.test.ts", "test/wishes-jars-screens.test.ts", "test/update-reload.test.ts", "test/push-permission.test.ts"];
  return {
    resolve: { alias: { "@": path.join(import.meta.dirname, "src/client") } },
    test: {
      projects: [
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
                  VAPID_PRIVATE_KEY: '{"kty":"EC","crv":"P-256","x":"4dmx42_tULjKS9Q0m3NDUZzG1V1Zf6LiSjO7UqbTGDg","y":"ShcAyxPRrSN0Qt7PIl9zqXqcZ39a_fM_F_WKbuKb1uw","d":"0E-37wYFvq_pXtvbW9IIdVaCEjJNgiiAmtUk0C5A4PQ"}',
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
      ]
    },
  };
});
