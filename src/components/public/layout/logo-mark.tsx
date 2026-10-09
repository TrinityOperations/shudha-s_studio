import Link from "next/link";

type Props = {
  studioName: string;
  homeLabel: string;
  /** Phone header uses the smaller mark and name */
  size?: "desktop" | "phone";
};

/**
 * The centred mark + name. The mark is an "S" until Shudha's logo file arrives: [placeholder].
 * The name fades when the header is collapsed (header-chrome.tsx sets data-collapsed). On desktop
 * the name shows from 1200px (Eczar 24, 30 from 1400px); below that the five nav links would push
 * the centre off, so only the mark shows.
 */
export function LogoMark({ studioName, homeLabel, size = "desktop" }: Props) {
  const desktop = size === "desktop";
  return (
    <Link
      href="/"
      title={homeLabel}
      className="flex items-center gap-3 rounded-full"
      data-testid="site-logo"
    >
      <span
        aria-hidden
        data-placeholder="logo"
        className={`font-heading border-mark text-mark grid shrink-0 place-items-center rounded-full border-[1.5px] bg-white leading-none ${
          desktop ? "size-10 text-xl" : "size-8 text-base"
        }`}
      >
        S
      </span>
      <span
        data-testid="site-name"
        className={`font-heading text-ink max-w-[16rem] overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 group-data-[collapsed=true]/header:max-w-0 group-data-[collapsed=true]/header:opacity-0 ${
          desktop ? "hidden text-2xl min-[1200px]:inline min-[1400px]:text-[30px]" : "text-[22px]"
        }`}
      >
        {studioName}
      </span>
    </Link>
  );
}
