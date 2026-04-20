import Foundation

/// Shared read/write layer for streak data that lives in the App Group
/// container. Used by the Capacitor plugin (writes), the widget (reads),
/// and the watchOS complication (reads).
///
/// The App Group identifier must match the entitlement configured on every
/// target that touches this store. Keep it in one place so a rename only
/// has to happen here.
public enum StreakStore {
    public static let appGroupID = "group.app.diamondheart.shared"

    private enum Key {
        static let current = "streak.current"
        static let todayCompleted = "streak.todayCompleted"
        static let todayTotal = "streak.todayTotal"
        static let updatedAt = "streak.updatedAt"
    }

    public struct Snapshot: Equatable {
        public let current: Int
        public let todayCompleted: Int
        public let todayTotal: Int
        public let updatedAt: Date

        public init(current: Int, todayCompleted: Int, todayTotal: Int, updatedAt: Date) {
            self.current = current
            self.todayCompleted = todayCompleted
            self.todayTotal = todayTotal
            self.updatedAt = updatedAt
        }

        public static let empty = Snapshot(
            current: 0,
            todayCompleted: 0,
            todayTotal: 0,
            updatedAt: .distantPast
        )
    }

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupID)
    }

    public static func write(_ snapshot: Snapshot) {
        guard let defaults else { return }
        defaults.set(snapshot.current, forKey: Key.current)
        defaults.set(snapshot.todayCompleted, forKey: Key.todayCompleted)
        defaults.set(snapshot.todayTotal, forKey: Key.todayTotal)
        defaults.set(snapshot.updatedAt.timeIntervalSince1970, forKey: Key.updatedAt)
    }

    public static func read() -> Snapshot {
        guard let defaults else { return .empty }
        let updated = defaults.double(forKey: Key.updatedAt)
        return Snapshot(
            current: defaults.integer(forKey: Key.current),
            todayCompleted: defaults.integer(forKey: Key.todayCompleted),
            todayTotal: defaults.integer(forKey: Key.todayTotal),
            updatedAt: updated > 0 ? Date(timeIntervalSince1970: updated) : .distantPast
        )
    }
}
