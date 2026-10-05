"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  className,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
