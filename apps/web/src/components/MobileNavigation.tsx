"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/daily-report", label: "Отчёт", icon: "chart" },
  { href: "/review", label: "Проверка", icon: "check" },
  { href: "/records", label: "Записи", icon: "voice" },
  { href: "/sellers", label: "Продавцы", icon: "people" }
] as const;

function NavigationIcon({ name }: { name: (typeof navigationItems)[number]["icon"] }) {
  if (name === "chart") {
    return <path d="M5 19V9m7 10V5m7 14v-7M3 19h18" />;
  }

  if (name === "voice") {
    return <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3m-4 0h8" />;
  }

  if (name === "check") {
    return <path d="M20 6 9 17l-5-5" />;
  }

  return <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m-2-11.96a4 4 0 0 1 0 7.75" />;
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mobileNav" aria-label="Мобильная навигация">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "mobileNavActive" : ""}
            aria-current={isActive ? "page" : undefined}
          >
            <svg className="mobileNavIcon" viewBox="0 0 24 24" aria-hidden="true">
              <NavigationIcon name={item.icon} />
            </svg>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
