import type {Email} from 'postal-mime';

/**
 * Checks an address against the allow list.
 * "@domain" entries match the domain and its subdomains; "user@domain" entries match exactly.
 * `address` must already be lowercased.
 */
export function isAllowedAddress(
  address: string,
  allowedSenders: readonly string[],
): boolean {
  const domain = address.split('@').pop() ?? '';
  return allowedSenders.some((entry) => {
    const allowed = entry.trim().toLowerCase();
    if (!allowed.startsWith('@')) {
      return address === allowed;
    }
    const allowedDomain = allowed.slice(1);
    return domain === allowedDomain || domain.endsWith(`.${allowedDomain}`);
  });
}

/**
 * A sender is allowed when the From header address is on the allow list and the
 * topmost Authentication-Results header (added by Cloudflare's MX) reports a DMARC
 * pass aligned with that From domain.
 *
 * See docs/email-authentication.md for what these headers mean and why each check is needed.
 */
export function isAllowedSender(
  email: Pick<Email, 'from' | 'headers'>,
  allowedSenders: readonly string[],
): boolean {
  const fromAddress = (email.from?.address ?? '').toLowerCase();
  const fromDomain = fromAddress.split('@').pop();
  if (
    !fromAddress.includes('@') ||
    !isAllowedAddress(fromAddress, allowedSenders)
  ) {
    return false;
  }

  // Trust only the topmost Authentication-Results header, and only if Cloudflare's
  // MX wrote it (value starts with "mx.cloudflare.net;"). Headers are in document
  // order, so the first one was added on receipt; any further down came with the
  // message and could be forged by the sender.
  const auth = email.headers.find((h) => h.key === 'authentication-results');
  if (!auth || !/^\s*mx\.cloudflare\.net\s*;/i.test(auth.value)) {
    return false;
  }

  // Pull the DMARC result and its checked domain out of that header, e.g.
  // "dmarc=pass ... header.from=notify.cloudflare.com" (staying within the dmarc
  // clause, up to the next ";"). The From header is easy to spoof; a DMARC pass
  // for exactly the From domain proves the domain actually sent the message.
  const dmarc = /\bdmarc=(\w+)[^;]*?\bheader\.from=([^\s;]+)/i.exec(auth.value);
  return (
    dmarc?.[1]?.toLowerCase() === 'pass' &&
    dmarc[2]?.toLowerCase() === fromDomain
  );
}
