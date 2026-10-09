import type { ReactNode } from "react";

type Props = {
  id?: string;
  title: string;
  /** Link or controls on the right */
  action?: ReactNode;
  className?: string;
};

/** Section heading (Eczar 40, 30 on phones) with an optional action on the right. */
export function SectionHeading({ id, title, action, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <h2 id={id} className="font-heading text-ink text-[30px] leading-tight lg:text-[40px]">
        {title}
      </h2>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
