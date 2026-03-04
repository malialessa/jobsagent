import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--gold)] text-black",
        outline:
          "border-[var(--line)] text-[var(--muted)] bg-transparent",
        purple:
          "border-transparent bg-[var(--purple)] text-white",
        gold:
          "border-[rgba(228,164,20,0.35)] bg-[rgba(228,164,20,0.12)] text-[var(--gold)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
