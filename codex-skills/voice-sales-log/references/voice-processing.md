# Voice Processing Reference

## Expected Flow

1. Receive Telegram `voice` message.
2. Get Telegram file link.
3. Download original Telegram OGG/Opus bytes.
4. Treat downloaded voice as:
   - filename: `<telegram_file_id>.ogg`
   - content type: `audio/ogg`
5. Upload original OGG to Supabase Storage.
6. Convert OGG/Opus to MP3 through ffmpeg.
7. Send MP3 to STT:
   - filename: `voice.mp3`
   - content type: `audio/mpeg`
   - multipart field: `file`
   - model: `STT_MODEL || whisper-large-v3-turbo`

## Required Logs

Log:

- original Telegram `file_id`;
- downloaded file size;
- original Telegram response content type;
- stored audio content type;
- STT filename;
- STT MIME type;
- STT file size;
- full STT error response without request headers or API keys.

## Never Do

- Do not send a raw Buffer to STT without filename.
- Do not let STT receive `application/octet-stream`.
- Do not use Telegram response `content-type` as truth when it is missing or generic.
- Do not log API keys.
