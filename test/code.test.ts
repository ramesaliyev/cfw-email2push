import {describe, expect, it} from 'vitest';
import {extractCode} from '../src/code';

describe('extractCode', () => {
  it('finds a 6-12 digit code', () => {
    expect(extractCode('Your code is 123456.')).toBe('123456');
    expect(extractCode('Code: 123456789012')).toBe('123456789012');
  });

  it('returns the first match', () => {
    expect(extractCode('first 111111 then 222222')).toBe('111111');
  });

  it('ignores numbers that are too short or too long', () => {
    expect(extractCode('12345')).toBeNull();
    expect(extractCode('1234567890123')).toBeNull();
  });

  it('ignores digits embedded in words', () => {
    expect(extractCode('abc123456')).toBeNull();
  });

  it('handles missing text', () => {
    expect(extractCode(undefined)).toBeNull();
    expect(extractCode('')).toBeNull();
  });
});
