export interface VideoEmbedInfo {
  type: "instagram" | "tiktok" | "youtube" | "direct";
  embedUrl?: string;
  originalUrl: string;
}

export function parseVideoEmbedUrl(url: string): VideoEmbedInfo {
  if (!url) return { type: "direct", originalUrl: "" };

  const cleanUrl = url.trim();

  // 1. Instagram Reel or Post
  const instaMatch = cleanUrl.match(/instagram\.com\/(reel|p)\/([A-Za-z0-9_-]+)/i) || cleanUrl.match(/instagr\.am\/(reel|p)\/([A-Za-z0-9_-]+)/i);
  if (instaMatch) {
    const code = instaMatch[2];
    return {
      type: "instagram",
      embedUrl: `https://www.instagram.com/p/${code}/embed`,
      originalUrl: cleanUrl,
    };
  }

  // 2. TikTok Video
  const tiktokMatch = cleanUrl.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i) || cleanUrl.match(/tiktok\.com\/v\/(\d+)/i);
  if (tiktokMatch) {
    const videoId = tiktokMatch[1];
    return {
      type: "tiktok",
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      originalUrl: cleanUrl,
    };
  }

  // 3. YouTube or YouTube Shorts
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/i);
  if (ytMatch) {
    const ytId = ytMatch[1];
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}`,
      originalUrl: cleanUrl,
    };
  }

  return { type: "direct", originalUrl: cleanUrl };
}
