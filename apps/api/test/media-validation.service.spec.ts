import { MediaValidationService } from '@bll/services/incidents/MediaValidationService';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';

describe('MediaValidationService', () => {
  const media = new MediaValidationService();

  it('accepts valid youtube', () => {
    const out = media.validate({
      youtube: 'https://youtu.be/abc123',
    });
    expect(out.youtube).toContain('youtu.be');
  });

  it('rejects bad image', () => {
    expect(() => media.validate({ image: 'ftp://x' })).toThrow(ApiHttpException);
  });
});
