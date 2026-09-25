import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/topbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LifeOS",
    template: "%s · LifeOS",
  },
  description:
    "Enter information once and LifeOS keeps your schedule, money, academic progress and fitness in sync.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div className="flex min-h-dvh flex-col">
          <TopBar />
          <main className="flex-1 px-5 py-6 md:px-10 md:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
