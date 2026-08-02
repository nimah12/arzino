import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}