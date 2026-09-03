import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:shadow-[0_0_24px_-4px_var(--glow-accent)] hover:opacity-90",
  secondary: "border border-border bg-surface hover:border-accent/60 hover:bg-surface-muted",
  ghost: "hover:bg-surface-muted",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "font-display inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide uppercase transition-all disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
