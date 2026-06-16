import type { AppEnv } from "../config/env";

type TranscriptionResponse = {
  text?: string;
  transcript?: string;
  segments?: Array<{ text?: string }>;
};

export type TranscriptionAudioFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export async function transcribeAudio(env: AppEnv, audio: TranscriptionAudioFile) {
  const form = new FormData();
  const audioBuffer = audio.buffer.buffer.slice(
    audio.buffer.byteOffset,
    audio.buffer.byteOffset + audio.buffer.byteLength
  ) as ArrayBuffer;

  form.append("file", new Blob([audioBuffer], { type: audio.contentType }), audio.filename);
  form.append("model", env.STT_MODEL || "whisper-large-v3-turbo");
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
    throw new Error(
      `STT request failed: status=${response.status}; filename=${audio.filename}; contentType=${audio.contentType}; response=${errorText}`
    );
  }

  const data = (await response.json()) as TranscriptionResponse;
  const text = data.text ?? data.transcript ?? data.segments?.map((segment) => segment.text).join(" ");

  return text?.trim() ?? "";
}
