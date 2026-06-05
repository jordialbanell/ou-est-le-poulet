// Unsigned Cloudinary uploads — the browser only needs the cloud name + an
// unsigned upload preset ("oelp_uploads", created manually in the dashboard).
// The API key/secret are never used here.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = "oelp_uploads";

export const cloudinaryConfigured = Boolean(CLOUD_NAME);

export interface UploadResult {
  url: string; // secure_url
  resourceType: "image" | "video" | string;
}

// Anything below this is small enough that compressing isn't worth the work.
const COMPRESS_THRESHOLD_BYTES = 500 * 1024; // 500KB
const MAX_DIMENSION = 1200; // px on the longest side
const JPEG_QUALITY = 0.75;

/**
 * Shrink a phone photo client-side before upload: cap the longest side at
 * 1200px and re-encode as JPEG q0.75. A typical 3–5MB photo drops to <400KB,
 * so uploads are far faster on bar wifi/4G.
 *
 * Skips videos, GIFs (canvas would flatten the animation), and already-small
 * files. Falls back to the original file if anything goes wrong, so a quirky
 * image can never block an upload.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file; // videos can't be compressed here
  if (file.type === "image/gif") return file; // preserve animation
  if (file.size < COMPRESS_THRESHOLD_BYTES) return file; // already small

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_DIMENSION / longest);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    // If compression didn't actually help, keep the original.
    if (!blob || blob.size >= file.size) return file;

    const compressed = new File([blob], file.name, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
    console.debug("[OELP] compressed image", {
      name: file.name,
      fromKB: Math.round(file.size / 1024),
      toKB: Math.round(compressed.size / 1024),
      dims: `${w}×${h}`,
    });
    return compressed;
  } catch (e) {
    console.warn("[OELP] image compression failed — uploading original", e);
    return file;
  }
}

/** Upload a photo or video to Cloudinary and return its secure URL. */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  if (!cloudinaryConfigured) {
    console.error("[OELP] Cloudinary not configured — VITE_CLOUDINARY_CLOUD_NAME is empty.");
    throw new Error("Cloudinary is not configured (VITE_CLOUDINARY_CLOUD_NAME missing).");
  }

  // Compress images before upload (no-op for video / small files).
  const upload = await compressImage(file);

  // /auto/ so the same endpoint accepts both images AND videos.
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  const form = new FormData();
  form.append("file", upload);
  form.append("upload_preset", UPLOAD_PRESET);

  console.debug("[OELP] Cloudinary upload →", {
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,
    endpoint,
    fileName: upload.name,
    fileType: upload.type,
    fileSizeKB: Math.round(upload.size / 1024),
  });

  // XHR (not fetch) so we can report upload progress on slow bar wifi/4G.
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.debug("[OELP] Cloudinary upload ok", data.secure_url, data.resource_type);
          resolve({ url: data.secure_url, resourceType: data.resource_type });
        } catch (err) {
          console.error("[OELP] Cloudinary: could not parse response", xhr.responseText, err);
          reject(new Error("Unexpected Cloudinary response."));
        }
      } else {
        let msg = `Upload failed (HTTP ${xhr.status}).`;
        let parsed: unknown = xhr.responseText;
        try {
          parsed = JSON.parse(xhr.responseText);
          msg = (parsed as { error?: { message?: string } })?.error?.message ?? msg;
        } catch {
          /* keep raw text */
        }
        // Surface the full Cloudinary error so the cause is obvious in the console.
        console.error("[OELP] Cloudinary upload failed", {
          status: xhr.status,
          cloudName: CLOUD_NAME,
          uploadPreset: UPLOAD_PRESET,
          response: parsed,
        });
        if (xhr.status === 400 && /preset/i.test(msg)) {
          msg += ` — check that the unsigned preset "${UPLOAD_PRESET}" exists in Cloudinary.`;
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      console.error("[OELP] Cloudinary network error", { endpoint, cloudName: CLOUD_NAME });
      reject(new Error("Network error during upload."));
    };
    xhr.send(form);
  });
}

/** Heuristic: is this Cloudinary URL a video (vs an image)? */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  if (/\/video\/upload\//.test(url)) return true;
  return /\.(mp4|mov|webm|m4v|avi|mkv|3gp|ogv)(\?|$)/i.test(url);
}
