export function toFacebookEmbedUrl(url: string): string | null {
  try {
    const encoded = encodeURIComponent(url);
    return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false`;
  } catch {
    return null;
  }
}
