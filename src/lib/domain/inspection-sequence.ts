/**
 * Inspection sequence per lot (RF-04, BR-INS-02).
 *
 * The case asks for letters "A" to "Z"; PA_IS says the sequence must keep going
 * after 26 inspections. We use bijective base-26, like spreadsheet columns:
 * A..Z, AA..AZ, BA..ZZ, AAA... The column is varchar(3), so 18,278 inspections per lot.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const MAX_SEQUENCE_LENGTH = 3;

export function sequenceToNumber(sequence: string): number {
  if (!/^[A-Z]+$/.test(sequence)) {
    throw new Error(`Invalid inspection sequence: "${sequence}"`);
  }
  let n = 0;
  for (const char of sequence) n = n * 26 + (ALPHABET.indexOf(char) + 1);
  return n;
}

export function numberToSequence(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Sequence number must be a positive integer, got ${n}`);
  }
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = ALPHABET[rem] + out;
    n = Math.floor((n - 1) / 26);
  }
  if (out.length > MAX_SEQUENCE_LENGTH) {
    throw new Error("Inspection sequence overflow (more than ZZZ)");
  }
  return out;
}

/** Next sequence for a lot, given the last one stored (null when the lot has none). */
export function nextSequence(last: string | null): string {
  return last === null ? "A" : numberToSequence(sequenceToNumber(last) + 1);
}
