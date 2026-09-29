import { HttpStatus } from '@nestjs/common';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

export type MediaInput = {
  image?: string | null;
  youtube?: string | null;
  facebook?: string | null;
};

const YOUTUBE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)[\w-]+/i;
const FACEBOOK =
  /^(https?:\/\/)?(www\.)?(facebook\.com\/.+\/videos\/|facebook\.com\/watch|fb\.watch\/)/i;

export class MediaValidationService {
  validate(media?: MediaInput | null): MediaInput {
    if (!media) return {};
    const out: MediaInput = {};
    if (media.image != null) {
      if (media.image === null) return out;
      if (!/^https?:\/\//i.test(media.image)) {
        throw new ApiHttpException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid image URL',
          ErrorCode.MEDIA_URL_INVALID,
        );
      }
      out.image = media.image;
    }
    if (media.youtube != null) {
      if (media.youtube === null) return { ...out, youtube: null };
      if (!YOUTUBE.test(media.youtube)) {
        throw new ApiHttpException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid YouTube URL',
          ErrorCode.MEDIA_URL_INVALID,
        );
      }
      out.youtube = media.youtube;
    }
    if (media.facebook != null) {
      if (media.facebook === null) return { ...out, facebook: null };
      if (!FACEBOOK.test(media.facebook)) {
        throw new ApiHttpException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Facebook URL',
          ErrorCode.MEDIA_URL_INVALID,
        );
      }
      out.facebook = media.facebook;
    }
    return out;
  }
}
