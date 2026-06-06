/**
 * The type-level mirror of tokens.css (§11.3). Component props are keyed to
 * these unions, so a feature picks a design value by NAME — `gap={4}`,
 * `tone="muted"` — and literally cannot pass a raw one: `gap="13px"` fails
 * `pnpm check`. So enforcement is split across two structural guards that both
 * fail CI: Stylelint forbids raw values in CSS, TypeScript forbids them at the
 * component API. Raw values live in exactly one place — tokens.css; this is its
 * typed index. The helpers map a token name to its `var(--…)` reference for the
 * components' inline bindings (the one spot a token name becomes a CSS value).
 */

export type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 24;
export type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
export type Tone = "ink" | "muted" | "faint" | "accent" | "inherit";
export type Family = "serif" | "sans" | "mono";
export type Leading = "prose" | "snug" | "tight";
export type Weight = 400 | 500 | 600 | 700;

export const spaceVar = (n?: Space): string | undefined =>
  n == null ? undefined : n === 0 ? "0" : `var(--space-${n})`;

export const sizeVar = (s: TextSize): string => `var(--text-${s})`;
export const familyVar = (f: Family): string => `var(--font-${f})`;
export const leadingVar = (l: Leading): string => `var(--leading-${l})`;

// Color tones → token ref. "inherit" yields undefined so the element inherits
// (used where a parent's hover drives a child's color, e.g. a link's title).
export const toneVar = (t: Tone): string | undefined =>
  t === "inherit"
    ? undefined
    : t === "accent"
      ? "var(--color-accent)"
      : t === "ink"
        ? "var(--color-ink)"
        : `var(--color-ink-${t})`; // muted | faint
