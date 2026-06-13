"use client";

import { useState } from "react";

type UploadedMedia = {
  id: string;
  resourceType: string;
  url: string;
  name: string;
  mimeType: string;
  size: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
};

/**
 * Uploads a file straight from the browser to Cloudinary using a short-lived
 * signature from /api/admin/upload-signature (credentials stay server-side).
 * Cloudinary is the source of truth for the media library, so the uploaded
 * asset shows up on the next list; this returns it for optimistic UI.
 */
export function useUpload() {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File): Promise<UploadedMedia> {
    setUploading(true);
    try {
      const sigRes = await fetch("/api/admin/upload-signature", { method: "POST" });
      if (!sigRes.ok) throw new Error("Could not get an upload signature. Check Cloudinary env vars.");
      const { cloudName, apiKey, timestamp, signature, folder } = await sigRes.json();

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append("folder", folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Upload failed (${res.status}): ${detail.slice(0, 160)}`);
      }
      const data = (await res.json()) as {
        public_id: string;
        secure_url: string;
        bytes: number;
        width?: number;
        height?: number;
        resource_type: string;
        format?: string;
        created_at?: string;
      };

      return {
        id: data.public_id,
        resourceType: data.resource_type,
        url: data.secure_url,
        name: file.name,
        mimeType: file.type || `${data.resource_type}/${data.format ?? "bin"}`,
        size: data.bytes ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        alt: null,
        createdAt: data.created_at ?? new Date().toISOString(),
      };
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading };
}
