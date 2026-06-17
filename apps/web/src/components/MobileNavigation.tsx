"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/daily-report", label: "Отчёт", icon: "▤" },
  { href: "/records", label: "Записи", icon: "●" },
  { href: "/sellers", label: "Продавцы", icon: "◒" }
] as const;

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
            <span className="mobileNavIcon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
