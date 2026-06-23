import { notFound } from "next/navigation";
import { TelegramDiagnostics } from "@/components/TelegramDiagnostics";

export default function DebugTelegramPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DEBUG_TELEGRAM_WEBAPP !== "true"
  ) {
    notFound();
  }

  return <TelegramDiagnostics />;
}
