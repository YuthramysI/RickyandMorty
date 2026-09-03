import { useId } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * An original animated portal-swirl effect built from SVG turbulence filters
 * (not traced from the show's actual portal art) - a jagged, glowing ring
 * that slowly roils and spins, used as a decorative background accent.
 */
export function PortalSwirl({ size = 480, className }: { size?: number; className?: string }) {
  const id = useId();
  const filterId = `portal-noise-${id}`;
  const gradientId = `portal-grad-${id}`;

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={cn("animate-portal-spin", className)}
      aria-hidden
    >
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.035" numOctaves={3} seed={7}>
            <animate
              attributeName="baseFrequency"
              dur="9s"
              values="0.012 0.035;0.017 0.045;0.012 0.035"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            scale="46"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--portal)" />
          <stop offset="55%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="140" fill={`url(#${gradientId})`} filter={`url(#${filterId})`} />
    </svg>
  );
}
