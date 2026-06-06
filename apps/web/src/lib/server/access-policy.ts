/**
 * The owner decision, as a PURE function so it's unit-testable without
 * SvelteKit's virtual modules (§13). Security-critical → fail closed:
 *   • a verified email grants access ONLY if it equals the configured owner;
 *   • with no verified assertion, only local dev is the owner (prod denies).
 */
export function decideOwner(
  verifiedEmail: string | null,
  ownerEmail: string | undefined,
  isDev: boolean,
): boolean {
  if (verifiedEmail) return Boolean(ownerEmail) && verifiedEmail === ownerEmail;
  return isDev;
}
