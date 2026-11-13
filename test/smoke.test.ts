import {env} from 'cloudflare:workers';
import {describe, expect, it} from 'vitest';
import worker from '../src/index';

describe('test environment', () => {
  it('runs with bindings from wrangler config and test secrets', () => {
    expect(env.ALLOWED_SENDERS).toContain('@notify.cloudflare.com');
    expect(env.PUSHOVER_TOKEN).toBe('test-token');
  });

  it('loads the worker with an email handler', () => {
    expect(typeof worker.email).toBe('function');
  });
});
