import Link from "next/link";
import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Голосовой журнал продаж",
  description: "Простой журнал голосовых продаж и отчётов для магазина"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <header className="appHeader">
          <div>
            <p className="eyebrow">voice-sales-log</p>
            <h1>Голосовой журнал продаж</h1>
          </div>
          <nav>
            <Link href="/daily-report">Отчёт</Link>
            <Link href="/records">Записи</Link>
            <Link href="/sellers">Продавцы</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
