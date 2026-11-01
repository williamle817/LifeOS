import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/topbar";
import { AuthGate } from "@/components/auth-gate";
import { StayFresh } from "@/components/stay-fresh";

const sans = Plus_Jakarta_Sans({
  variable: "--font-app",
  subsets: ["latin", "vietnamese"],
});

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "vietnamese"],
  axes: ["SOFT", "opsz"],
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("lifeos.theme")==="dark")document.documentElement.dataset.theme="night"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full font-sans">
        <div className="flex min-h-dvh flex-col">
          <TopBar />
          <main className="flex flex-1 flex-col px-4 pt-8 pb-28 md:px-6 md:pt-10 md:pb-12">
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
