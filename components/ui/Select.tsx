import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "border-border bg-surface text-foreground focus-visible:border-accent h-10 rounded-md border px-3 text-sm transition-colors focus-visible:shadow-[0_0_0_3px_var(--glow-accent)] focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
