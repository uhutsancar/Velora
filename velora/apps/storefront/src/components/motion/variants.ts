import type { Variants } from 'framer-motion';

/** Velora's easing curve: a firm start that settles rather than bouncing. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Entrance used by every item inside a StaggerGroup. */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
