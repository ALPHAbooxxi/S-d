import { Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  metadataBase: new URL("https://svd.media-wilkens.de"),
  title: "SVD Stickertausch – SV Dalum 100 Jahre",
  description:
    "Tauschbörse für das Stickeralbum zum 100-jährigen Jubiläum des SV Dalum 1926 e.V. Finde Tauschpartner, verwalte deine Sammlung und vervollständige dein Album!",
  keywords: ["SV Dalum", "Sticker", "Tauschbörse", "Stickeralbum", "100 Jahre", "Jubiläum", "Fußball", "Dalum"],
  manifest: "/manifest.json",
  openGraph: {
    title: "SVD Stickertausch – SV Dalum 100 Jahre",
    description: "Tauschbörse für das Stickeralbum zum 100-jährigen Jubiläum des SV Dalum 1926 e.V.",
    url: "https://svd.media-wilkens.de",
    siteName: "SVD Stickertausch",
    type: "website",
    images: [{ url: "/icons/icon-512x512.png", width: 512, height: 512, alt: "SVD Stickertausch" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SVD Sticker",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" className={`${montserrat.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body style={{ fontFamily: "var(--font-montserrat), 'Montserrat', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
