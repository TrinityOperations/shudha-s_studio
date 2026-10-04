import type { Metadata } from "next";
import { Geist, Noto_Sans_Bengali } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getGeneralSettings } from "@/db/queries/settings";
import { getLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { getMessages } from "@/lib/i18n/t";
import { publicEnv } from "@/lib/env.public";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

// Bengali needs a font with proper conjunct support (PW-82).
const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGeneralSettings();
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: settings.studioName, template: `%s · ${settings.studioName}` },
    description: settings.tagline,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geist.variable} ${notoSansBengali.variable} h-full antialiased`}
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
