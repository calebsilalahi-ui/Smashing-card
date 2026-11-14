/** Client-side receipt image compression: JPEG, max 1200px wide, targeting < 300 KB. */

export interface CompressOptions {
  maxWidth?: number;
  quality?: number;
  maxBytes?: number;
}

type Source = Blob | HTMLVideoElement | HTMLCanvasElement;

function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.length - i - 1 : dataUrl.length;
  return Math.floor((b64 * 3) / 4);
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("IMAGE_DECODE_FAILED"));
    };
    img.src = url;
  });
}

type Drawable = { el: CanvasImageSource; width: number; height: number; close?: () => void };

async function toDrawable(source: Source): Promise<Drawable> {
  if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
    return { el: source, width: source.videoWidth, height: source.videoHeight };
  }
  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    return { el: source, width: source.width, height: source.height };
  }
  const blob = source as Blob;
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { el: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // fall through to <img>
    }
  }
  const img = await loadImage(blob);
  return { el: img, width: img.naturalWidth, height: img.naturalHeight };
}

export async function compressImage(source: Source, opts: CompressOptions = {}): Promise<string> {
  const maxWidth = opts.maxWidth ?? 1200;
  const startQuality = opts.quality ?? 0.8;
  const maxBytes = opts.maxBytes ?? 300 * 1024;

  const drawable = await toDrawable(source);
  try {
    if (!drawable.width || !drawable.height) throw new Error("EMPTY_IMAGE");
    let width = Math.min(drawable.width, maxWidth);
    let height = Math.round((drawable.height * width) / drawable.width);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

    const render = (): void => {
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(drawable.el, 0, 0, width, height);
    };

    render();
    let out = canvas.toDataURL("image/jpeg", startQuality);
    if (dataUrlBytes(out) <= maxBytes) return out;

    for (const q of [0.7, 0.6, 0.5]) {
      out = canvas.toDataURL("image/jpeg", Math.min(q, startQuality));
      if (dataUrlBytes(out) <= maxBytes) return out;
    }
    for (let i = 0; i < 6 && dataUrlBytes(out) > maxBytes; i++) {
      width = Math.max(320, Math.round(width * 0.85));
      height = Math.max(320, Math.round((drawable.height * width) / drawable.width));
      render();
      out = canvas.toDataURL("image/jpeg", 0.5);
    }
    return out;
  } finally {
    drawable.close?.();
  }
}
