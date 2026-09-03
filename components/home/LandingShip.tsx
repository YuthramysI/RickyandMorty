"use client";

import { motion } from "framer-motion";

/**
 * An original, generic sci-fi saucer silhouette (not the show's actual ship
 * design - that's copyrighted art) animated flying in and landing, to give
 * the hero some interdimensional-travel motion without using copyrighted assets.
 */
export function LandingShip({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <motion.div
        initial={{ y: -160, x: 40, opacity: 0, rotate: -8 }}
        animate={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
        >
          <svg viewBox="0 0 220 140" width="200" height="128" className="drop-shadow-2xl">
            <ellipse cx="110" cy="86" rx="92" ry="16" fill="var(--accent)" opacity="0.16" />
            <path
              d="M40 78 Q110 40 180 78 Q150 100 110 100 Q70 100 40 78 Z"
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <path
              d="M40 78 Q110 40 180 78"
              fill="none"
              stroke="var(--accent-2)"
              strokeWidth="1.5"
              opacity="0.7"
            />
            <ellipse cx="110" cy="58" rx="34" ry="24" fill="var(--accent)" opacity="0.35" />
            <ellipse
              cx="110"
              cy="58"
              rx="34"
              ry="24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
            />
            <circle cx="66" cy="82" r="4" fill="var(--accent-2)" />
            <circle cx="110" cy="88" r="4" fill="var(--accent-2)" />
            <circle cx="154" cy="82" r="4" fill="var(--accent-2)" />
          </svg>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scaleY: 0.4 }}
        animate={{ opacity: [0, 0.5, 0.3], scaleY: 1 }}
        transition={{ duration: 1.2, delay: 1.4, repeat: Infinity, repeatType: "reverse" }}
        className="mx-auto -mt-2 h-24 w-28 origin-top"
        style={{
          background: "linear-gradient(to bottom, var(--accent), transparent)",
          clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
        }}
      />
    </div>
  );
}
