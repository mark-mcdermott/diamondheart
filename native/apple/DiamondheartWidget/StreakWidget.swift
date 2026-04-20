import SwiftUI
import WidgetKit

struct StreakEntry: TimelineEntry {
    let date: Date
    let snapshot: StreakStore.Snapshot
}

struct StreakProvider: TimelineProvider {
    func placeholder(in _: Context) -> StreakEntry {
        StreakEntry(
            date: Date(),
            snapshot: StreakStore.Snapshot(
                current: 7,
                todayCompleted: 3,
                todayTotal: 5,
                updatedAt: Date()
            )
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(StreakEntry(date: Date(), snapshot: StreakStore.read()))
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let now = Date()
        let entry = StreakEntry(date: now, snapshot: StreakStore.read())
        // Refresh every hour so "today" stays meaningful even if the main
        // app hasn't been opened — the Capacitor plugin will force a sooner
        // reload when fresh data arrives.
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now.addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

struct StreakWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: StreakEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallLayout(snapshot: entry.snapshot)
        case .systemMedium:
            MediumLayout(snapshot: entry.snapshot)
        case .accessoryCircular:
            AccessoryCircular(snapshot: entry.snapshot)
        case .accessoryRectangular:
            AccessoryRectangular(snapshot: entry.snapshot)
        case .accessoryInline:
            Text("\(entry.snapshot.current)d · \(entry.snapshot.todayCompleted)/\(entry.snapshot.todayTotal)")
        default:
            SmallLayout(snapshot: entry.snapshot)
        }
    }
}

private struct SmallLayout: View {
    let snapshot: StreakStore.Snapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .foregroundStyle(BrandColors.primary)
                Text("\(snapshot.current)")
                    .font(.system(size: 34, weight: .bold, design: .serif))
                    .foregroundStyle(BrandColors.heading)
                Text("day\(snapshot.current == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(BrandColors.muted)
            }
            Spacer()
            ProgressBadge(snapshot: snapshot)
            Text("Diamondheart")
                .font(.caption2)
                .foregroundStyle(BrandColors.muted)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(BrandColors.background, for: .widget)
    }
}

private struct MediumLayout: View {
    let snapshot: StreakStore.Snapshot

    var body: some View {
        HStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Streak")
                    .font(.caption)
                    .foregroundStyle(BrandColors.muted)
                HStack(spacing: 6) {
                    Image(systemName: "flame.fill")
                        .foregroundStyle(BrandColors.primary)
                    Text("\(snapshot.current)")
                        .font(.system(size: 42, weight: .bold, design: .serif))
                        .foregroundStyle(BrandColors.heading)
                }
                Text("days in a row")
                    .font(.caption2)
                    .foregroundStyle(BrandColors.muted)
            }
            Spacer(minLength: 8)
            VStack(alignment: .leading, spacing: 8) {
                Text("Today")
                    .font(.caption)
                    .foregroundStyle(BrandColors.muted)
                Text("\(snapshot.todayCompleted) / \(snapshot.todayTotal)")
                    .font(.system(size: 22, weight: .semibold, design: .serif))
                    .foregroundStyle(BrandColors.heading)
                ProgressTrack(snapshot: snapshot)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .containerBackground(BrandColors.background, for: .widget)
    }
}

private struct ProgressBadge: View {
    let snapshot: StreakStore.Snapshot

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(BrandColors.success)
                .imageScale(.small)
            Text("\(snapshot.todayCompleted)/\(snapshot.todayTotal) today")
                .font(.caption2)
                .foregroundStyle(BrandColors.foreground)
        }
    }
}

private struct ProgressTrack: View {
    let snapshot: StreakStore.Snapshot

    private var fraction: Double {
        guard snapshot.todayTotal > 0 else { return 0 }
        return min(1, Double(snapshot.todayCompleted) / Double(snapshot.todayTotal))
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(BrandColors.border)
                Capsule()
                    .fill(BrandColors.primary)
                    .frame(width: geo.size.width * fraction)
            }
        }
        .frame(height: 6)
    }
}

private struct AccessoryCircular: View {
    let snapshot: StreakStore.Snapshot

    var body: some View {
        ZStack {
            Circle().strokeBorder(.tertiary, lineWidth: 2)
            VStack(spacing: 0) {
                Text("\(snapshot.current)")
                    .font(.system(size: 18, weight: .bold))
                Text("day\(snapshot.current == 1 ? "" : "s")")
                    .font(.system(size: 8))
                    .foregroundStyle(.secondary)
            }
        }
        .containerBackground(.clear, for: .widget)
    }
}

private struct AccessoryRectangular: View {
    let snapshot: StreakStore.Snapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Diamondheart")
                .font(.caption2)
                .foregroundStyle(.secondary)
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                Text("\(snapshot.current) day streak")
                    .font(.headline)
            }
            Text("\(snapshot.todayCompleted) of \(snapshot.todayTotal) today")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .containerBackground(.clear, for: .widget)
    }
}

struct StreakWidget: Widget {
    let kind: String = "DiamondheartStreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Streak")
        .description("Your current streak and today's habit progress.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}
