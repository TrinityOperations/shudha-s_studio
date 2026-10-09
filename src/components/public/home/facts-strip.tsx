import { getT } from "@/lib/i18n";

const FACTS = ["home.facts.1", "home.facts.2", "home.facts.3", "home.facts.4"] as const;

/** Home section 2: Eczar 22 marquee of the studio facts between two lines. */
export async function FactsStrip() {
  const t = await getT();
  const facts = FACTS.map((key) => t(key));
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {facts.map((fact) => (
        <li key={fact} className="flex items-center">
          <span className="font-heading text-ink px-6 text-[18px] whitespace-nowrap lg:text-[22px]">
            {fact}
          </span>
          <span aria-hidden className="bg-mark size-2 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
  return (
    <section
      aria-label={t("home.facts.1")}
      className="border-line overflow-hidden border-y py-4"
      data-testid="facts-strip"
    >
      <div className="marquee">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
