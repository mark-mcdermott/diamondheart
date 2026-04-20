import { Capacitor, registerPlugin } from "@capacitor/core";

export const WIDGET_SYNC_PLUGIN_NAME = "WidgetSync";

export type StreakSnapshot = {
  current: number;
  todayCompleted: number;
  todayTotal: number;
  updatedAt: number;
};

interface WidgetSyncPlugin {
  write(snapshot: StreakSnapshot): Promise<void>;
}

const plugin = registerPlugin<WidgetSyncPlugin>(WIDGET_SYNC_PLUGIN_NAME);

function safeInt(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function syncStreakToWidgets(snapshot: StreakSnapshot): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (!Capacitor.isPluginAvailable(WIDGET_SYNC_PLUGIN_NAME)) return false;

  try {
    await plugin.write({
      current: safeInt(snapshot.current),
      todayCompleted: safeInt(snapshot.todayCompleted),
      todayTotal: safeInt(snapshot.todayTotal),
      updatedAt: snapshot.updatedAt,
    });
    return true;
  } catch {
    return false;
  }
}
