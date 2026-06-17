"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refreshReport() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button className="refreshButton" type="button" onClick={refreshReport} disabled={isPending} aria-live="polite">
      <span aria-hidden="true">↻</span>
      {isPending ? "Обновление..." : "Обновить"}
    </button>
  );
}
