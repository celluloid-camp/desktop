import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "fr"],
  fallbackLocales: {
    default: "en",
  },
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
      exclude: ["**/node_modules/**", "**/locales/**"],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
