import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import { staggerItemVariants } from './variants';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 32 },
  down: { x: 0, y: -32 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
  none: { x: 0, y: 0 },
};

export interface RevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  /** Fraction of the element that must be visible before it animates. */
  amount?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
}

/**
 * Scroll-triggered entrance. Animates once, honours prefers-reduced-motion, and
 * uses transform/opacity only so it stays on the compositor.
 */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className,
  amount = 0.2,
  as = 'div',
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const offset = OFFSETS[direction];

  const MotionTag = motion[as];

  if (reduceMotion) {
    return <MotionTag className={className}>{children}</MotionTag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

/** Container that staggers its direct children as they enter the viewport. */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  amount = 0.15,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
}) {
  const reduceMotion = useReducedMotion();

  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : stagger } },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Subtle vertical parallax. Kept to ±`distance` px so it reads as depth rather
 * than as the page fighting the scroll.
 */
export function Parallax({
  children,
  distance = 60,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={cn('overflow-hidden', className)}>
      <motion.div style={reduceMotion ? undefined : { y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

/** Letter-by-letter headline reveal for hero copy. */
export function TextReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <span className={className}>{text}</span>;

  const words = text.split(' ');

  return (
    <span className={cn('inline-block', className)} aria-label={text}>
      {words.map((word, wordIndex) => (
        <span key={`${word}-${wordIndex}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            aria-hidden
            className="inline-block"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: delay + wordIndex * 0.07, ease: EASE }}
          >
            {word}
            {wordIndex < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
