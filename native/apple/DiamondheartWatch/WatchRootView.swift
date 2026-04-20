import SwiftUI

struct WatchRootView: View {
    @State private var snapshot: StreakStore.Snapshot = StreakStore.read()

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                header
                streakCard
                todayCard
                footer
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
        .onAppear { snapshot = StreakStore.read() }
    }

    private var header: some View {
        VStack(spacing: 2) {
            Text("Diamondheart")
                .font(.system(.footnote, design: .serif))
                .foregroundStyle(.secondary)
            Text(Date.now, format: .dateTime.weekday(.abbreviated).day().month(.abbreviated))
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
    }

    private var streakCard: some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .foregroundStyle(BrandColors.primary)
                Text("\(snapshot.current)")
                    .font(.system(size: 34, weight: .bold, design: .serif))
            }
            Text(snapshot.current == 1 ? "day streak" : "day streak")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(BrandColors.card.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
    }

    private var todayCard: some View {
        VStack(spacing: 4) {
            Text("TODAY")
                .font(.system(size: 10, weight: .semibold))
                .kerning(0.8)
                .foregroundStyle(.secondary)
            Text("\(snapshot.todayCompleted) / \(snapshot.todayTotal)")
                .font(.system(size: 22, weight: .semibold, design: .serif))
            ProgressView(value: fraction)
                .tint(BrandColors.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .padding(.horizontal, 10)
        .background(BrandColors.card.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
    }

    @ViewBuilder
    private var footer: some View {
        if snapshot.updatedAt > .distantPast {
            Text("Synced \(snapshot.updatedAt, style: .relative) ago")
                .font(.system(size: 9))
                .foregroundStyle(.tertiary)
        } else {
            Text("Open Diamondheart on your phone to sync")
                .font(.system(size: 9))
                .multilineTextAlignment(.center)
                .foregroundStyle(.tertiary)
        }
    }

    private var fraction: Double {
        guard snapshot.todayTotal > 0 else { return 0 }
        return min(1, Double(snapshot.todayCompleted) / Double(snapshot.todayTotal))
    }
}
