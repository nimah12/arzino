import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "ارزینو | قیمت لحظه‌ای ارز، طلا و سکه",
  description: "نمایش قیمت لحظه‌ای دلار، یورو، پوند، درهم، لیر، طلا و سکه با نمودار و تغییرات لحظه‌ای",
  openGraph: {
    title: "ارزینو | قیمت لحظه‌ای ارز و طلا",
    description: "قیمت لحظه‌ای ارز، طلا و سکه با به‌روزرسانی خودکار",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d12" },
  ],
};

// Runs before first paint so the saved/preferred theme is applied before
// React hydrates — prevents a flash of the wrong theme (FOUC).
const themeScript = `(function(){try{var s=localStorage.getItem("arzino-theme");var d=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
