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
    throw new Error("Cloudinary is not configured (VITE_CLOUDINARY_CLOUD_NAME missing).");
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

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
          resolve({ url: data.secure_url, resourceType: data.resource_type });
        } catch {
          reject(new Error("Unexpected Cloudinary response."));
        }
      } else {
        let msg = `Upload failed (${xhr.status}).`;
        try {
          msg = JSON.parse(xhr.responseText)?.error?.message ?? msg;
        } catch {
          /* keep default */
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });
}

/** Heuristic: is this Cloudinary URL a video (vs an image)? */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  if (/\/video\/upload\//.test(url)) return true;
  return /\.(mp4|mov|webm|m4v|avi|mkv|3gp|ogv)(\?|$)/i.test(url);
}
