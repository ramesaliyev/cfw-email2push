# Cloudflare Email to Push Notifications Worker

A proof of concept for a [cloudflare email worker](https://developers.cloudflare.com/email-routing/email-workers/) that extracts authentication code from received email and delivers it as a push notification through [pushover](https://pushover.net).

The environment variables that are not visible under `wrangler.jsonc` are defined as [secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

# Development

```sh
npm install
cp .dev.vars.example .dev.vars   # fill in Pushover credentials for `npm run dev`
```

| Script                            | What it does                                                                |
| --------------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`                     | Run the worker locally                                                      |
| `npm test` / `npm run test:watch` | Run tests inside the Workers runtime (Vitest + `@cloudflare/vitest-plugin`) |
| `npm run typecheck`               | Type-check with `tsc`                                                       |
| `npm run types`                   | Regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc`      |
| `npm run format`                  | Format with Prettier                                                        |
| `npm run check`                   | Types up to date + typecheck + tests                                        |
| `npm run deploy`                  | Deploy to Cloudflare                                                        |

# Resources

- https://docs.emailengine.app/how-to-parse-emails-with-cloudflare-email-workers/
