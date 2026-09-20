/**
 * The Velora seal — the one drawing of the brand mark.
 *
 * It lives in the shared package because both apps put it in a header, and a
 * logo copied into two repositories is a logo that eventually differs in two
 * repositories. Everything is `currentColor`, so the same component works on
 * the storefront's sand header, the ink footer and the white admin shell
 * without a colour prop.
 *
 * The wordmark stays in each app: the storefront pairs it with a link to home,
 * the admin appends an environment tag, and their type scales differ.
 */
export interface VeloraMarkProps {
  className?: string;
  /**
   * Accessible name. Omit it where an adjacent wordmark already names the
   * brand, and the mark is hidden from assistive technology instead.
   */
  title?: string;
}

export function VeloraMark({ className, title }: VeloraMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      {/* Outer ring — the edge of an atelier stamp. */}
      <circle cx="20" cy="20" r="18.5" stroke="currentColor" strokeWidth="1.4" />

      {/* Inner saddle stitch. The dash pattern is tuned to the circumference
          (2πr ≈ 91.1 at r = 14.5) so no stitch is cut in half at the join. */}
      <circle
        cx="20"
        cy="20"
        r="14.5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.55"
        strokeDasharray="3.1 3.1"
        strokeLinecap="round"
      />

      {/* The V: two strokes mitred at the point, cut square like a punch. */}
      <path
        d="M12.4 12.6 L20 26.4 L27.6 12.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Founding bar — the rule a maker's stamp always carries. */}
      <path d="M15.6 29.6 H24.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  );
}
