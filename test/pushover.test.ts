import {afterEach, describe, expect, it, vi} from 'vitest';
import {sendPushNotification} from '../src/pushover';

const env = {
  DEBUG: false,
  PUSHOVER_URL: 'https://push.example/messages.json',
  PUSHOVER_TOKEN: 'tok',
  PUSHOVER_USER: 'usr',
  PUSHOVER_TTL: 300,
};

afterEach(() => vi.restoreAllMocks());

describe('sendPushNotification', () => {
  it('POSTs the code to Pushover as JSON', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', {status: 200}));

    const res = await sendPushNotification('123456', env);

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(env.PUSHOVER_URL);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      token: 'tok',
      user: 'usr',
      ttl: 300,
      message: 'Code: 123456',
      title: 'Auth Code',
    });
  });
});
