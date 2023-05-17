import type { Config } from "tailwindcss";

import baseConfig from "@nostr-bot/tailwind-config";

export default {
  content: ["./src/**/*.tsx"],
  presets: [baseConfig],
} satisfies Config;
