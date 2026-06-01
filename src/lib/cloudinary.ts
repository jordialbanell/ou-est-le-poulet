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

/** Upload a photo or video to Cloudinary and return its secure URL. */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  if (!cloudinaryConfigured) {
    console.error("[OELP] Cloudinary not configured — VITE_CLOUDINARY_CLOUD_NAME is empty.");
    throw new Error("Cloudinary is not configured (VITE_CLOUDINARY_CLOUD_NAME missing).");
  }

  // /auto/ so the same endpoint accepts both images AND videos.
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  console.debug("[OELP] Cloudinary upload →", {
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,
    endpoint,
    fileName: file.name,
    fileType: file.type,
    fileSizeKB: Math.round(file.size / 1024),
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
