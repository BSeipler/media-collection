/** Compress a cover photo in the browser before upload (keeps Turso free-tier happy). */
export async function compressCoverImage(
  file: File,
  maxWidth = 480,
  quality = 0.78,
): Promise<{ blob: Blob; mime: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/jpeg",
      quality,
    );
  });

  if (blob.size > 450_000) {
    throw new Error("Image still too large after compression — try a closer crop");
  }

  return { blob, mime: "image/jpeg" };
}
