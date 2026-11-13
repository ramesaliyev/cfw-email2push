import {env} from 'cloudflare:workers';
import {afterEach, describe, expect, it, vi} from 'vitest';
import worker from '../src/index';

const PASS =
  'mx.cloudflare.net; dkim=pass header.d=notify.cloudflare.com; spf=pass; dmarc=pass header.from=notify.cloudflare.com';

function rawEmail({
  from = 'noreply@notify.cloudflare.com',
  auth = PASS,
  body = 'Your login code is 123456.',
}: {from?: string; auth?: string; body?: string} = {}): string {
  return [
    `Authentication-Results: ${auth}`,
    `From: Sender <${from}>`,
    'To: login@example.com',
    'Subject: Code',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
    '',
  ].join('\r\n');
}

function fakeMessage(raw: string) {
  const bytes = new TextEncoder().encode(raw);
  return {
    from: 'bounce@cf-bounce.notify.cloudflare.com',
    to: 'login@example.com',
    headers: new Headers(),
    raw: new Blob([bytes]).stream(),
    rawSize: bytes.length,
    setReject: vi.fn(),
    forward: vi.fn().mockResolvedValue({messageId: 'x'}),
    reply: vi.fn(),
  };
}

type Msg = ReturnType<typeof fakeMessage>;
const run = (msg: Msg) =>
  worker.email(msg as unknown as ForwardableEmailMessage, env);

afterEach(() => vi.restoreAllMocks());

describe('email handler', () => {
  it('sends a push with the code from an allowed sender', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', {status: 200}));
    const msg = fakeMessage(rawEmail());

    await run(msg);

    expect(msg.setReject).not.toHaveBeenCalled();
    expect(msg.forward).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0]![1]?.body as string);
    expect(body.message).toBe('Code: 123456');
    expect(body.token).toBe('test-token');
  });

  it('rejects a disallowed sender without pushing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const msg = fakeMessage(
      rawEmail({
        from: 'x@evil.com',
        auth: 'mx.cloudflare.net; dmarc=pass header.from=evil.com',
      }),
    );

    await run(msg);

    expect(msg.setReject).toHaveBeenCalledWith('Sender is not allowed.');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(msg.forward).not.toHaveBeenCalled();
  });

  it('rejects when DMARC fails', async () => {
    const msg = fakeMessage(
      rawEmail({auth: PASS.replace('dmarc=pass', 'dmarc=fail')}),
    );
    await run(msg);
    expect(msg.setReject).toHaveBeenCalled();
  });

  it('forwards when no code is found', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const msg = fakeMessage(rawEmail({body: 'No code here.'}));

    await run(msg);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(msg.forward).toHaveBeenCalledWith('forward@example.com');
  });

  it('forwards when the push fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad token', {status: 400}),
    );
    const msg = fakeMessage(rawEmail());

    await run(msg);

    expect(msg.forward).toHaveBeenCalledWith('forward@example.com');
  });
});
