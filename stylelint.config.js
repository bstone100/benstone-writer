/**
 * Structural design-token enforcement (ARCHITECTURE §11.3) — the companion to
 * eslint.config.js. ESLint enforces the import boundaries; Stylelint enforces
 * that the design system's *values* come from tokens, not literals.
 *
 * The principle, made structural: the token-backed axes — COLOR, TYPE
 * (family + size), SPACE (padding/margin/gap), and RADIUS — must be expressed
 * as `var(--token)`. A raw color (`#333`, `rgb(...)`) or a raw absolute length
 * (`16px`, `1.25rem`) in those properties FAILS lint, and therefore CI. So the
 * wrong shape can't merge; consistency + reskinnability are enforced, not hoped.
 *
 * What is deliberately NOT policed (KISS — don't tokenize what isn't a system):
 *   • border-width — `1px`/`2px` hairlines are primitives; the color in them is
 *     already a token.
 *   • width / height / max-width / grid track sizes — layout one-offs, not a
 *     reused scale.
 *   • transform / filter distances, line-height, letter-spacing — not a
 *     token-backed axis.
 *   • em-relative values — `em` is the *correct* tool for prose-internal rhythm
 *     (it scales with reading size); it's a relationship, not a magic constant.
 *   • the round idioms `50%` (circle) and `100%`.
 *
 * tokens.css is the ONE place raw values live (see its override below).
 */

// Properties whose values must resolve to a design token.
const TOKEN_PROPS = [
  "/color/", // color, background-color, border-color, *-color, …
  "fill",
  "stroke",
  "font-family",
  "font-size",
  "/^padding/", // padding, padding-left, …
  "/^margin/", // margin, margin-top, …
  "gap",
  "row-gap",
  "column-gap",
  "border-radius",
];

const STRICT_VALUE = [
  TOKEN_PROPS,
  {
    // var(...) always satisfies the rule. These are the only literals allowed:
    ignoreValues: [
      "0", // dimensionless / zero
      "auto",
      "inherit",
      "initial",
      "unset",
      "none",
      "transparent",
      "currentColor",
      "100%", // fill-container idiom
      "50%", // circle idiom (border-radius)
      "/em(\\s|$)/", // any em-relative value (prose rhythm) — incl. composites like `0.15em 0`
    ],
    disableFix: true,
    message:
      "Use a design token: var(--…). Raw color/type/space/radius values live only in tokens.css (ARCHITECTURE §11.3).",
  },
];

export default {
  plugins: ["stylelint-declaration-strict-value"],
  rules: {
    "scale-unlimited/declaration-strict-value": STRICT_VALUE,
  },
  ignoreFiles: [
    "**/.svelte-kit/**",
    "**/dist/**",
    "**/build/**",
    "**/.wrangler/**",
    "**/node_modules/**",
  ],
  overrides: [
    // Svelte single-file components: extract + lint the <style> block.
    { files: ["**/*.svelte"], customSyntax: "postcss-html" },
    // tokens.css IS the source of raw values — the rule must not police it.
    { files: ["**/tokens.css"], rules: { "scale-unlimited/declaration-strict-value": null } },
  ],
};
