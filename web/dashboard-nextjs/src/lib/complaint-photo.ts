/** API returns a gateway path for stored photos; data/https URLs stay as-is. */
export function complaintPhotoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/api/proxy/")
  ) {
    return url;
  }
  const path = url.startsWith("/") ? url : `/${url}`;
  return `/api/proxy/v1${path}`;
}
