import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/topbar";
import { AuthGate } from "@/components/auth-gate";
import { StayFresh } from "@/components/stay-fresh";

const sans = Nunito({
  variable: "--font-app",
  subsets: ["latin", "vietnamese"],
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
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div className="flex min-h-dvh flex-col">
          <TopBar />
          <main className="flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
            <AuthGate>
              <StayFresh />
              {children}
            </AuthGate>
          </main>
        </div>
      </body>
    </html>
  );
}
