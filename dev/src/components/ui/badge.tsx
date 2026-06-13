import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-[var(--r-pill)] border px-2.5 py-1 text-[11px] font-semibold", {
  variants: {
    variant: {
      default: "border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[var(--cb-text-2)]",
      yellow: "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow-2)]",
      destructive: "border-[rgba(255,107,91,.35)] bg-[rgba(255,107,91,.14)] text-[var(--cb-danger)]"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
