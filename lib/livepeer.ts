// Livepeer utility functions — all client-side.
// Upload goes through a Cloudflare Worker proxy (NEXT_PUBLIC_LIVEPEER_PROXY_URL)
// to avoid CORS restrictions on the Livepeer Studio API.
// Playback uses hls.js directly with Livepeer's CDN URLs.

const PROXY_URL = process.env.NEXT_PUBLIC_LIVEPEER_PROXY_URL?.replace(/\/$/, "");

export async function createLivepeerUpload(name: string): Promise<{
  url: string;
  assetId: string;
}> {
  if (!PROXY_URL) {
    throw new Error(
      "NEXT_PUBLIC_LIVEPEER_PROXY_URL is not set. Deploy the Cloudflare Worker in workers/livepeer-proxy/ and add the URL to .env.local."
    );
  }

  const response = await fetch(`${PROXY_URL}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name || "Untitled Video",
      staticMp4: true,
      playbackPolicy: { type: "public" },
    }),
  });

  if (!response.ok) throw new Error("Failed to create upload URL");
  const data = await response.json();
  return { url: data.url, assetId: data.asset.id };
}

export async function uploadToLivepeer(
  file: File,
  name: string,
  onProgress: (percent: number) => void
): Promise<{ assetId: string; playbackId: string }> {
  // Step 1: Get upload URL from our API route
  const { url, assetId } = await createLivepeerUpload(name);

  // Step 2: Upload directly to Livepeer
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.statusText}`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  // Step 3: Poll for playback ID
  const playbackId = await pollForPlaybackId(assetId);
  return { assetId, playbackId };
}

async function pollForPlaybackId(
  assetId: string,
  maxAttempts = 30,
  intervalMs = 3000
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${PROXY_URL}/asset/${assetId}`);
    if (res.ok) {
      const asset = await res.json();
      if (asset.playbackId) return asset.playbackId;
      if (asset.status?.phase === "failed") throw new Error("Transcoding failed");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for playback ID");
}

// Livepeer VOD CDN — account-specific path prefix (fixed per Livepeer account)
const LP_VOD_BASE = "https://vod-cdn.lp-playback.studio/raw/jxf4iblf6wlsyor6526t4tcmtmqa/catalyst-vod-com/hls";

export function getLivepeerThumbnail(playbackId: string): string {
  return `${LP_VOD_BASE}/${playbackId}/thumbnails/keyframe_0.png`;
}

export function getLivepeerHLS(playbackId: string): string {
  return `${LP_VOD_BASE}/${playbackId}/index.m3u8`;
}
