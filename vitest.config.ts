import {cloudflareTest} from '@cloudflare/vitest-plugin';
import {defineConfig} from 'vitest/config';

// Tests run inside the Workers runtime (workerd via Miniflare), configured from
// wrangler.jsonc. Secrets aren't in the config, so tests get dummy values.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {configPath: './wrangler.jsonc'},
      miniflare: {
        bindings: {
          FORWARD_TO: 'forward@example.com',
          PUSHOVER_TOKEN: 'test-token',
          PUSHOVER_USER: 'test-user',
        },
      },
    }),
  ],
});
