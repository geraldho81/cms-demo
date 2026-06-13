import { createHash } from "crypto";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return Response.json(
      { error: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET." },
      { status: 500 }
    );
  }

  const folder = process.env.CLOUDINARY_FOLDER || "slim-minima";
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signature: sha1 of the sorted params + API secret
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  return Response.json({ cloudName, apiKey, timestamp, signature, folder });
}
