import type { ReactNode } from "react";

type Props = { title: string; intro?: string; children: ReactNode; wide?: boolean };

/** The content pages' frame: Eczar title, optional intro, measured body. */
export function PageShell({ title, intro, children, wide = false }: Props) {
  return (
    <section
      className={`mx-auto w-full space-y-8 px-4 py-10 lg:px-6 lg:py-16 ${wide ? "max-w-6xl" : "max-w-3xl"}`}
    >
      <header className="space-y-3">
        <h1 className="font-heading text-ink text-[34px] leading-tight lg:text-[44px]">{title}</h1>
        {intro ? <p className="text-ink-soft max-w-prose text-lg">{intro}</p> : null}
      </header>
      {children}
    </section>
  );
}
