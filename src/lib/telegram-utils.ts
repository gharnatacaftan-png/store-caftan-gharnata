// Telegram helpers shared between the server (notifications) and the client
// (settings UI counter). Kept free of `import "server-only"` so the settings
// page can reuse the exact same parsing rules as the server without importing a
// server-only module into a client component.

export function parseTelegramChatIds(raw: string): string[] {
  // Accept one or several chat ids separated by newlines, commas, semicolons
  // or spaces (e.g. "987654321\n-1001234567890;123456789"). Telegram channel/user
  // ids are numeric (optionally with a -100 prefix) or @name — none contain
  // internal whitespace — so splitting on whitespace/comma/semicolon is safe.
  return Array.from(
    new Set(
      String(raw || "")
        .split(/[\n\r\s,;]+/)
        .map((s) => s.trim().replace(/[\t ]/g, ""))
        .filter(Boolean)
    )
  );
}

export function normalizeTelegramChatId(chatId: string): string {
  return chatId.trim().replace(/\s+/g, "");
}
