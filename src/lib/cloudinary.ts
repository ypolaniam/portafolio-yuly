export function getOptimizedImageUrl(url: string, width = 800): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  const regex = /\/upload\/(?:[^/]+\/)?(.*)$/;
  const match = url.match(regex);
  if (!match) return url;

  const publicId = match[1].replace(/\.[^.]+$/, "");

  return `https://res.cloudinary.com/${import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}
