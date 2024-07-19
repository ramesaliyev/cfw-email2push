# Cloudflare Email to Push Notifications Worker

A proof of concept for a [cloudflare email worker](https://developers.cloudflare.com/email-routing/email-workers/) that extracts authentication code from received email and delivers it as a push notification through [pushover](https://pushover.net).

The environment variables that are not visible under `wrangler.toml` are defined as [secrets](https://developers.cloudflare.com/workers/configuration/secrets/). 

# Resources

- https://docs.emailengine.app/how-to-parse-emails-with-cloudflare-email-workers/
