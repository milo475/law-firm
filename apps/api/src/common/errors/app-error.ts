import type { ErrorCode, ErrorDetails } from '@law-firm/shared';

/**
 * The body of a thrown HTTP exception: a stable code the reader's own app translates, the Mongolian
 * wording as a fallback for anything that does not translate, and the values the wording needs.
 *
 *   throw new NotFoundException(err('case.notFound', 'Хэрэг олдсонгүй'));
 *   throw new BadRequestException(err('documentRequest.tooManyFiles', `Нэг удаад ${max}…`, { max }));
 *
 * `details` is for numbers and enum values only — never a name, an address or a file name, which
 * would then travel into a client's browser console and into the error report.
 */
export function err(code: ErrorCode, message: string, details?: ErrorDetails): {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
} {
  return details ? { code, message, details } : { code, message };
}
