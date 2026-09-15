import { randomInt } from 'node:crypto';

const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHABET = LETTERS + DIGITS;

/** 12 unambiguous characters with at least one letter and one digit (satisfies PasswordSchema). */
export function generateTemporaryPassword(length = 12): string {
  const chars = [LETTERS[randomInt(LETTERS.length)], DIGITS[randomInt(DIGITS.length)]];
  while (chars.length < length) chars.push(ALPHABET[randomInt(ALPHABET.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
