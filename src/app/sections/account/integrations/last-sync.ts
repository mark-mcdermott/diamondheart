const MS_PER_HOUR = 60 * 60 * 1000;

export function formatLastSync(date: string | null, now = Date.now()): string {
  if (!date) return "Never";
  const synced = new Date(date);
  const hoursAgo = Math.floor((now - synced.getTime()) / MS_PER_HOUR);
  if (hoursAgo < 1) return "Just now";
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  return synced.toLocaleDateString();
}
