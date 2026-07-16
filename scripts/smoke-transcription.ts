import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getEnv } from "../apps/bot/src/config/env";
import { transcribeAudio } from "../apps/bot/src/services/transcription.service";

const fixtureUrl = new URL("../tests/fixtures/voice-sale-two-items.ogg", import.meta.url);
const fixturePath = fileURLToPath(fixtureUrl);
const fixtureStat = await stat(fixturePath);

if (!fixtureStat.isFile() || fixtureStat.size === 0) {
  throw new Error("Transcription fixture is missing or empty.");
}

const transcript = await transcribeAudio(getEnv(), {
  buffer: await readFile(fixturePath),
  filename: "voice-sale-two-items.ogg",
  contentType: "audio/ogg"
});

if (!transcript.trim()) {
  throw new Error("STT smoke failed: provider returned an empty transcript.");
}

console.log(JSON.stringify({
  smoke: "transcription",
  fixtureBytes: fixtureStat.size,
  transcriptLength: transcript.length,
  nonEmpty: true
}));
