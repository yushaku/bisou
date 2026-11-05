// Pair codes: 6 characters without look-alikes (no 0/O, 1/I/L). Shared by client and Worker.

export const PAIR_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PAIR_CODE_LENGTH = 6;

const PAIR_CODE_RE = new RegExp(`^[${PAIR_CODE_ALPHABET}]{${PAIR_CODE_LENGTH}}$`);

/** Uppercase and drop spaces and dashes, so "abc-def" and "ABC DEF" both read "ABCDEF". */
export function normalizePairCode(value: string): string {
  return value.toUpperCase().replace(/[\s\-\u2010-\u2015\u2212]/g, "");
}

export function isPairCode(value: string): boolean {
  return PAIR_CODE_RE.test(value);
}
