/**
 * Extracts the code from the email text: the first standalone run of 6-12 digits.
 * Returns null when there is none.
 */
export function extractCode(text: string | undefined): string | null {
  const match = /\b\d{6,12}\b/.exec(text ?? '');
  return match ? match[0] : null;
}
