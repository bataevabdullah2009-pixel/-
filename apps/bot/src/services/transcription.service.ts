import type { AppEnv } from "../config/env";

type TranscriptionResponse = {
  text?: string;
  transcript?: string;
  segments?: Array<{ text?: string }>;
};

export async function transcribeAudio(env: AppEnv, audio: Buffer, fileName: string) {
  const form = new FormData();
  const audioBuffer = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
  form.append("file", new Blob([audioBuffer]), fileName);
  form.append("model", "whisper-1");
  form.append("response_format", "json");

  const response = await fetch(env.STT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STT_API_KEY}`
    },
    body: form
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`STT request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as TranscriptionResponse;
  const text = data.text ?? data.transcript ?? data.segments?.map((segment) => segment.text).join(" ");

  return text?.trim() ?? "";
}
