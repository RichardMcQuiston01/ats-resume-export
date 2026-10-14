/** Generates a random UUID for resume entities (via the Web Crypto API). */
export function createId(): string {
  return crypto.randomUUID();
}
