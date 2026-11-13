import type {Email} from 'postal-mime';
import {describe, expect, it} from 'vitest';
import {isAllowedAddress, isAllowedSender} from '../src/sender';

describe('isAllowedAddress', () => {
  const allowed = ['@notify.cloudflare.com', 'Boss@Example.com '];

  it('matches a domain entry exactly and its subdomains', () => {
    expect(isAllowedAddress('a@notify.cloudflare.com', allowed)).toBe(true);
    expect(isAllowedAddress('a@x.notify.cloudflare.com', allowed)).toBe(true);
  });

  it('does not match lookalike domains', () => {
    expect(isAllowedAddress('a@evilnotify.cloudflare.com', allowed)).toBe(
      false,
    );
    expect(isAllowedAddress('a@cloudflare.com', allowed)).toBe(false);
  });

  it('matches exact address entries, normalising the entry', () => {
    expect(isAllowedAddress('boss@example.com', allowed)).toBe(true);
    expect(isAllowedAddress('other@example.com', allowed)).toBe(false);
  });
});

function email(
  from: string | undefined,
  authResults: string[],
): Pick<Email, 'from' | 'headers'> {
  return {
    from: from === undefined ? undefined : {name: '', address: from},
    headers: authResults.map((value) => ({
      key: 'authentication-results',
      originalKey: 'Authentication-Results',
      value,
    })),
  };
}

const PASS =
  'mx.cloudflare.net; dkim=pass header.d=notify.cloudflare.com; spf=pass; dmarc=pass header.from=notify.cloudflare.com';
const allowed = ['@notify.cloudflare.com'];

describe('isAllowedSender', () => {
  it('accepts an allowed From with aligned DMARC pass', () => {
    expect(
      isAllowedSender(email('noreply@notify.cloudflare.com', [PASS]), allowed),
    ).toBe(true);
  });

  it('is case-insensitive on the From address', () => {
    expect(
      isAllowedSender(email('NoReply@Notify.Cloudflare.com', [PASS]), allowed),
    ).toBe(true);
  });

  it('rejects a From that is not on the list', () => {
    const auth = PASS.replace(
      'header.from=notify.cloudflare.com',
      'header.from=evil.com',
    );
    expect(isAllowedSender(email('x@evil.com', [auth]), allowed)).toBe(false);
  });

  it('rejects missing or malformed From', () => {
    expect(isAllowedSender(email(undefined, [PASS]), allowed)).toBe(false);
    expect(isAllowedSender(email('notanaddress', [PASS]), allowed)).toBe(false);
  });

  it('rejects when Authentication-Results is missing', () => {
    expect(isAllowedSender(email('a@notify.cloudflare.com', []), allowed)).toBe(
      false,
    );
  });

  it('rejects when the topmost Authentication-Results is not from Cloudflare MX', () => {
    const forged = 'mx.evil.com; dmarc=pass header.from=notify.cloudflare.com';
    expect(
      isAllowedSender(
        email('a@notify.cloudflare.com', [forged, PASS]),
        allowed,
      ),
    ).toBe(false);
  });

  it('rejects DMARC fail or none', () => {
    for (const result of ['fail', 'none']) {
      const auth = PASS.replace('dmarc=pass', `dmarc=${result}`);
      expect(
        isAllowedSender(email('a@notify.cloudflare.com', [auth]), allowed),
      ).toBe(false);
    }
  });

  it('rejects DMARC pass for a different domain', () => {
    const auth = PASS.replace(
      'header.from=notify.cloudflare.com',
      'header.from=other.com',
    );
    expect(
      isAllowedSender(email('a@notify.cloudflare.com', [auth]), allowed),
    ).toBe(false);
  });

  it('requires DMARC domain to equal the From domain, not a parent', () => {
    const auth = PASS.replace(
      'header.from=notify.cloudflare.com',
      'header.from=cloudflare.com',
    );
    expect(
      isAllowedSender(email('a@notify.cloudflare.com', [auth]), allowed),
    ).toBe(false);
  });
});
