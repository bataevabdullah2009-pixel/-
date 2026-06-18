# Vercel webhook — результат

Production update входит через Vercel route и передаётся тому же `processTelegramUpdate`, который использует локальный polling. Некорректный secret отклоняется до обработки update.
