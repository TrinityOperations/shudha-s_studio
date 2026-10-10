import type { Metadata } from "next";
import { Eczar, Geist, Noto_Sans_Bengali, Tiro_Bangla } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { getGeneralSettings } from "@/db/queries/settings";
import { getLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { OG_LOCALES } from "@/lib/i18n/locale";
import { localised } from "@/lib/i18n/localised";
import { getMessages } from "@/lib/i18n/t";
import { publicEnv } from "@/lib/env.public";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

// Headings (docs/design.md, "Type").
const eczar = Eczar({
  variable: "--font-eczar",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Bengali needs a font with proper conjunct support (PW-82). Both Bengali web fonts are applied
// only on bn pages and not preloaded, so English pages never request them; the header's toggle
// uses a system Bengali font (globals.css, .font-bengali-system).
const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  preload: false,
});
const tiroBangla = Tiro_Bangla({
  variable: "--font-tiro-bangla",
  subsets: ["bengali"],
  weight: "400",
  preload: false,
});
// The few Bangla accent lines on English pages (hero line, signature, the toggle) in Tiro Bangla
// without the full Bengali font: a 10 KB subset holding only those characters, built with
// fonttools from the OFL font (public/fonts, licence alongside). docs/design.md, "Type".
const tiroBanglaAccent = localFont({
  src: "../../public/fonts/tiro-bangla-accent.woff2",
  variable: "--font-tiro-bangla-accent",
  weight: "400",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getGeneralSettings(), getLocale()]);
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: settings.studioName, template: `%s · ${settings.studioName}` },
    description: localised(locale, settings.tagline, settings.taglineBn),
    openGraph: { siteName: settings.studioName, locale: OG_LOCALES[locale] },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const bengaliFonts = locale === "bn" ? `${notoSansBengali.variable} ${tiroBangla.variable}` : "";

  return (
    <html
      lang={locale}
      className={`${geist.variable} ${eczar.variable} ${tiroBanglaAccent.variable} ${bengaliFonts} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-center" />
        </I18nProvider>
      </body>
    </html>
  );
}
