export const PRESENCE_ACTIVE_CUTOFF_MS = 60_000;
export const PRESENCE_HEARTBEAT_MS = 20_000;

export type PresenceMeditator = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  isAnonymous: boolean;
};

export function isActivePing(lastPingAt: Date, now: Date): boolean {
  return now.getTime() - lastPingAt.getTime() < PRESENCE_ACTIVE_CUTOFF_MS;
}

export function redactMeditator(
  meditator: PresenceMeditator,
  showName: boolean,
): PresenceMeditator {
  if (showName) {
    return { ...meditator, isAnonymous: false };
  }
  return {
    userId: meditator.userId,
    name: null,
    avatarUrl: null,
    isAnonymous: true,
  };
}

export function summarizeMeditators(
  preview: PresenceMeditator[],
  overflow: number,
): string {
  const names = preview.map((m) => (m.isAnonymous ? "Someone" : (m.name ?? "Someone")));
  if (names.length === 0) return "Sit with them for a moment.";
  if (names.length === 1 && overflow === 0) return `${names[0]} is on the cushion.`;
  if (overflow > 0) {
    const leading = names.slice(0, 3).join(", ");
    const extra = Math.max(0, names.length - 3) + overflow;
    return extra > 0 ? `${leading} and ${extra} other${extra === 1 ? "" : "s"}` : leading;
  }
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}
