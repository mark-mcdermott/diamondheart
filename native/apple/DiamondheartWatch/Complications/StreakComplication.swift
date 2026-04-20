import SwiftUI
import WidgetKit

/// watchOS complications are just WidgetKit widgets with the accessory
/// families. This file lives in a separate "Complication" widget-extension
/// target embedded in the watch app; see native/apple/README.md for the
/// Xcode steps.

struct ComplicationEntry: TimelineEntry {
    let date: Date
    let snapshot: StreakStore.Snapshot
}

struct ComplicationProvider: TimelineProvider {
    func placeholder(in _: Context) -> ComplicationEntry {
        ComplicationEntry(
            date: Date(),
            snapshot: StreakStore.Snapshot(current: 7, todayCompleted: 3, todayTotal: 5, updatedAt: Date())
        )
    }

    func getSnapshot(in _: Context, completion: @escaping (ComplicationEntry) -> Void) {
        completion(ComplicationEntry(date: Date(), snapshot: StreakStore.read()))
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<ComplicationEntry>) -> Void) {
        let entry = ComplicationEntry(date: Date(), snapshot: StreakStore.read())
        // Complications get a tighter refresh budget; rely on the phone's
        // plugin to push fresh data.
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
    }
}

struct ComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ComplicationEntry

    var body: some View {
        switch family {
        case .accessoryCorner:
            CornerView(snapshot: entry.snapshot)
        case .accessoryCircular:
            CircularView(snapshot: entry.snapshot)
        case .accessoryInline:
            Text("🔥 \(entry.snapshot.current)d · \(entry.snapshot.todayCompleted)/\(entry.snapshot.todayTotal)")
        case .accessoryRectangular:
            RectangularView(snapshot: entry.snapshot)
        default:
            CircularView(snapshot: entry.snapshot)
        }
    }
}

private struct CircularView: View {
    let snapshot: StreakStore.Snapshot

    var body: some View {
        ZStack {
            Circle().strokeBorder(.tertiary, lineWidth: 2)
            VStack(spacing: 0) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 10))
                Text("\(snapshot.current)")
                    .font(.system(size: 16, weight: .bold))
            }
        }
        .containerBackground(.clear, for: .widget)
    }
}

private struct CornerView: View {
    let snapshot: StreakStore.Snapshot

    var body: some View {
        Text("\(snapshot.current)")
            .font(.system(size: 18, weight: .bold))
            .widgetCurvesContent()
            .widgetLabel {
                Text("\(snapshot.todayCompleted)/\(snapshot.todayTotal) today")
            }
            .containerBackground(.clear, for: .widget)
    }
}

private struct RectangularView: View {
    let snapshot: StreakStore.Snapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 3) {
                Image(systemName: "flame.fill")
                Text("\(snapshot.current) day streak")
                    .font(.system(size: 13, weight: .semibold))
            }
            Text("\(snapshot.todayCompleted) of \(snapshot.todayTotal) today")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
        .containerBackground(.clear, for: .widget)
    }
}

@main
struct DiamondheartComplicationBundle: WidgetBundle {
    var body: some Widget {
        StreakComplication()
    }
}

struct StreakComplication: Widget {
    let kind: String = "DiamondheartStreakComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ComplicationProvider()) { entry in
            ComplicationView(entry: entry)
        }
        .configurationDisplayName("Streak")
        .description("Your current Diamondheart streak.")
        .supportedFamilies([
            .accessoryCorner,
            .accessoryCircular,
            .accessoryInline,
            .accessoryRectangular,
        ])
    }
}

private extension View {
    // accessoryCorner supports .widgetCurvesContent() only on watchOS 9+.
    // Wrap so availability gates stay in one place.
    @ViewBuilder
    func widgetCurvesContent() -> some View {
        if #available(watchOS 9.0, *) {
            self.widgetAccentable()
        } else {
            self
        }
    }
}
