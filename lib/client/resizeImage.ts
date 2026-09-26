// Browser-only. Downscales photos before upload: phone photos are often
// 4000+ px and several MB, while Claude's vision works best at <= 1568 px on
// the long edge. Also normalizes everything (incl. HEIC in Safari) to JPEG.

const MAX_EDGE_PX = 1568;
const JPEG_QUALITY = 0.86;

export class ImageDecodeError extends Error {
  constructor(fileName: string) {
    super(`"${fileName}" couldn't be opened. Use a JPG, PNG, or WebP image.`);
    this.name = "ImageDecodeError";
  }
}

export async function resizeImageToJpeg(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageDecodeError(file.name);
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageDecodeError(file.name);
  ctx.fillStyle = "#ffffff"; // flatten transparent PNGs onto white, not black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new ImageDecodeError(file.name);

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
