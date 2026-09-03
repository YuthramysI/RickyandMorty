import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "border-border bg-surface text-foreground placeholder:text-foreground/40 focus-visible:border-accent h-10 w-full rounded-md border px-3 text-sm transition-colors focus-visible:shadow-[0_0_0_3px_var(--glow-accent)] focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
