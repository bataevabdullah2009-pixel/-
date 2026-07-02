import Link from "next/link";
import type { Metadata } from "next";
import Script from "next/script";
import { MobileNavigation } from "@/components/MobileNavigation";
import { TelegramAuthBootstrap } from "@/components/TelegramAuthBootstrap";
import { isDemoMode, requireOwner } from "@/lib/owner-auth";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Голосовой журнал продаж",
  description: "Простой журнал голосовых продаж и отчётов для магазина",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let hasSession = false;
  try {
    await requireOwner();
    hasSession = true;
  } catch {
    // The client bootstrap validates fresh Telegram initData and reloads once.
  }

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <TelegramAuthBootstrap hasSession={hasSession} demoMode={isDemoMode()}>
          <header className="appHeader">
            <div>
              <p className="eyebrow">voice-sales-log</p>
              <h1>Голосовой журнал продаж</h1>
            </div>
            <nav className="desktopNav" aria-label="Основная навигация">
              <Link href="/daily-report">Отчёт</Link>
              <Link href="/review">Проверка</Link>
              <Link href="/records">Записи</Link>
              <Link href="/sellers">Продавцы</Link>
            </nav>
          </header>
          <main>{children}</main>
          <MobileNavigation />
        </TelegramAuthBootstrap>
      </body>
    </html>
  );
}
