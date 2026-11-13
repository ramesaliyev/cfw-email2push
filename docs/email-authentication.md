# Email authentication

How email2push decides whether an incoming email really comes from an allowed sender, and what the email headers involved mean. The check lives in `isAllowedSender` in [`src/sender.ts`](../src/sender.ts).

## An email has two "from" addresses

1. **Envelope sender** (`MAIL FROM`): the address mail servers use behind the scenes, mostly for sending bounces back. The user never sees it. In the worker it's `message.from`. For Cloudflare Access it's an odd address like `...@cf-bounce.notify.cloudflare.com`.
2. **Header `From:`**: the line a mail app shows as the sender, for example `From: Cloudflare Access <noreply@notify.cloudflare.com>`. In the worker it's `email.from.address`.

**Anyone can write anything in either one.** Email has no built-in proof of who sent it, so the allow list alone would accept a spammer who simply writes `From: noreply@notify.cloudflare.com`.

## Three systems add the proof

- **SPF (Sender Policy Framework):** the domain publishes in DNS which servers may send its mail. The receiving server checks that the sending server's IP is on that list. This checks the _envelope_ domain.
- **DKIM (DomainKeys Identified Mail):** the sending server signs the message with a private key. The receiver checks the signature against a public key published in the domain's DNS. If it checks out, that domain really sent the message and it wasn't changed on the way. The signing domain is `d=` (here `header.d=`).
- **DMARC (Domain-based Message Authentication, Reporting and Conformance):** ties the other two to the `From:` line the reader actually sees. It **passes** only if SPF or DKIM passed **for the same domain as the header `From:`**. That domain match is called alignment. So `dmarc=pass header.from=notify.cloudflare.com` means the message really came from notify.cloudflare.com.

## `Authentication-Results`: the receiver writes down what it found

The sender doesn't run these checks. **The receiving server does**, which for email2push is Cloudflare Email Routing. It writes the results into a new header at the top of the message, for example:

```
Authentication-Results: mx.cloudflare.net;
    dkim=pass header.d=notify.cloudflare.com;
    spf=pass smtp.mailfrom=cf-bounce.notify.cloudflare.com;
    dmarc=pass header.from=notify.cloudflare.com
```

- `mx.cloudflare.net` is who did the checking. `mx` is the usual name for an incoming mail server.
- After that, each `;`-separated part is one check and its result.

## Why only the _topmost_ one counts

Servers add headers at the **top** as a message passes through them, so the first header is the newest. Cloudflare adds its header last, just before the worker runs, so it's at the very top.

A spammer can still put a fake `Authentication-Results: mx.cloudflare.net; dmarc=pass ...` in their own message. That fake header will always sit _below_ the real one Cloudflare adds. So the worker:

1. Takes only the first `Authentication-Results` header and checks that it starts with `mx.cloudflare.net;`. This is the first regex check.
2. Reads `dmarc=<result>` and `header.from=<domain>` from it, and requires `pass` for **exactly** the domain in `From:`. This is the second regex check.

All together, an email gets through only when:

- the `From:` address is in `ALLOWED_SENDERS`,
- the topmost `Authentication-Results` header was written by Cloudflare,
- and it says DMARC passed for exactly that `From:` domain.
