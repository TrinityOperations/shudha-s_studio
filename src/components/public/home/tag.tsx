import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  variant?: "photo" | "quiet" | "credit";
  className?: string;
};

/** The gift tag (docs/design.md, "The tag"). */
export function Tag({ children, variant = "photo", className = "" }: Props) {
  const extra = variant === "quiet" ? "tag-quiet" : variant === "credit" ? "tag-credit" : "";
  return <span className={`tag ${extra} ${className}`}>{children}</span>;
}

/** A tag hanging from a tile's top-left corner on a thread. The parent must be `relative`. */
export function HangingTag({ children }: { children: ReactNode }) {
  return (
    <>
      <span aria-hidden className="tag-thread" />
      <span className="tag tag-hanging">{children}</span>
    </>
  );
}
