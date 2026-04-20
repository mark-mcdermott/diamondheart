import Capacitor
import Foundation
import WidgetKit

/// Bridges JS `WidgetSync.write({...})` calls into the shared App Group
/// store and kicks the WidgetKit timeline so the home-screen widget and
/// watch complication refresh on the next available update cycle.
@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin {
    @objc public func write(_ call: CAPPluginCall) {
        let current = call.getInt("current") ?? 0
        let todayCompleted = call.getInt("todayCompleted") ?? 0
        let todayTotal = call.getInt("todayTotal") ?? 0
        let updatedAtMs = call.getDouble("updatedAt") ?? (Date().timeIntervalSince1970 * 1000)

        let snapshot = StreakStore.Snapshot(
            current: max(0, current),
            todayCompleted: max(0, todayCompleted),
            todayTotal: max(0, todayTotal),
            updatedAt: Date(timeIntervalSince1970: updatedAtMs / 1000)
        )

        StreakStore.write(snapshot)

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve()
    }
}
