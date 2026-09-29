import { digestRefreshToken } from '@shared/utils/tokenDigest.util';

describe('refresh token digest', () => {
  it('is stable', () => {
    const a = digestRefreshToken('token-a');
    const b = digestRefreshToken('token-a');
    expect(a).toBe(b);
    expect(a).not.toBe(digestRefreshToken('token-b'));
  });
});
