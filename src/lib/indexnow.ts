import { after } from "next/server";
import { siteUrl } from "@/lib/site-url";

// Public by design - Bing verifies ownership via public/<key>.txt
const INDEXNOW_KEY = "fd95258f41a3248d6e04c3fd18ec1824";

// Best-effort throttle so autosaves don't spam the endpoint (resets per instance)
const lastPinged = new Map<string, number>();
const THROTTLE_MS = 10 * 60 * 1000;

function ping(paths: string[]) {
  const base = siteUrl();
  if (!base.startsWith("https://")) return;

  const now = Date.now();
  const urlList = paths
    .map((p) => `${base}${p === "/" ? "" : p}`)
    .filter((url) => {
      const last = lastPinged.get(url);
      if (last && now - last < THROTTLE_MS) return false;
      lastPinged.set(url, now);
      return true;
    });
  if (!urlList.length) return;

  after(async () => {
    try {
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: new URL(base).host,
          key: INDEXNOW_KEY,
          keyLocation: `${base}/${INDEXNOW_KEY}.txt`,
          urlList,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Pings are best-effort; never fail a write over them
    }
  });
}

export function pingPagesIndexNow(slugs: string[]) {
  if (slugs.length) ping(slugs.map((s) => (s === "home" ? "/" : `/${s}`)));
}

export function pingPostsIndexNow(slugs: string[]) {
  if (slugs.length) ping([...slugs.map((s) => `/blog/${s}`), "/blog"]);
}
