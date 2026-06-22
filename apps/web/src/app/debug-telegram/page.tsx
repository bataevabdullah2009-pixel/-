"use client";

import { useEffect, useState } from "react";
import {
  getTelegramInitData,
  initializeTelegramWebApp,
  waitForTelegramWebApp
} from "@/lib/telegram-api";

type TelegramDiagnostics = {
  hasWindow: boolean;
  hasTelegram: boolean;
  hasWebApp: boolean;
  initDataLength: number;
  initDataUnsafeUserId: boolean;
  platform: string;
  version: string;
  openedFromTelegram: boolean;
};

const initialDiagnostics: TelegramDiagnostics = {
  hasWindow: false,
  hasTelegram: false,
  hasWebApp: false,
  initDataLength: 0,
  initDataUnsafeUserId: false,
  platform: "unknown",
  version: "unknown",
  openedFromTelegram: false
};

export default function DebugTelegramPage() {
  const [diagnostics, setDiagnostics] = useState(initialDiagnostics);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void waitForTelegramWebApp().then((webApp) => {
      initializeTelegramWebApp(webApp);
      if (!active) return;

      const initData = getTelegramInitData();
      setDiagnostics({
        hasWindow: typeof window !== "undefined",
        hasTelegram: typeof window !== "undefined" && Boolean(window.Telegram),
        hasWebApp: Boolean(webApp),
        initDataLength: initData.length,
        initDataUnsafeUserId: Boolean(webApp?.initDataUnsafe?.user?.id),
        platform: webApp?.platform ?? "unknown",
        version: webApp?.version ?? "unknown",
        openedFromTelegram: Boolean(webApp && initData)
      });
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="pageStack telegramDebugPage">
      <div className="pageTitle">
        <div>
          <p className="eyebrow">Безопасная диагностика</p>
          <h2>Telegram WebApp</h2>
          <p className="pageLead">Страница показывает только наличие Telegram SDK и подписанных launch-данных. Содержимое initData и токены не выводятся.</p>
        </div>
      </div>

      {!ready ? (
        <div className="actionNotice" role="status">Ожидаем инициализацию Telegram…</div>
      ) : (
        <dl className="telegramDebugGrid">
          {Object.entries(diagnostics).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{typeof value === "boolean" ? String(value) : value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
