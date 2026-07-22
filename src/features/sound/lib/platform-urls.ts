export function getBilibiliVideoUrl(videoId: string) {
  return `https://www.bilibili.com/video/${encodeURIComponent(videoId.trim())}`;
}

export function getVkVideoUrl(videoId: string) {
  const normalizedId = videoId.trim().replace(/^video/i, "");
  return `https://vk.com/video${encodeURIComponent(normalizedId)}`;
}
