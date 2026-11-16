import type { Metadata, Viewport } from 'next';
import './globals.css';
import './fonts';
import { SITE, STORAGE_KEYS, THEME_COLORS } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Telemetry } from '@/components/Telemetry';
import { robotsFor } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  // Every page inherits this unless it sets its own (through robotsFor, so previews stay noindex).
  robots: robotsFor(),
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
  width: 'device-width',
  initialScale: 1,
};

/** Runs before first paint: applies a stored theme choice so there is no flash. */
const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.theme,
)}));if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}document.documentElement.classList.add('js')})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        {/* Vercel Web Analytics + Speed Insights: only in builds made on Vercel (VERCEL=1), so local
            builds and other hosts render and request nothing extra. See /privacy. */}
        {process.env.VERCEL ? <Telemetry /> : null}
      </body>
    </html>
  );
}
