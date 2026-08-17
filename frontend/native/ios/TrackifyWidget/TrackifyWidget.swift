/**
 * TrackifyWidget — SwiftUI home-screen & lock-screen widgets.
 *
 * Reads the JSON the app writes through the TrackifyNative bridge (App
 * Group UserDefaults) and renders: net worth + delta + sparkline (small /
 * medium), and a needs-tagging count for the lock screen. WidgetData is a
 * CONTRACT with src/native/widget.ts — change them together.
 */
import SwiftUI
import WidgetKit

struct WidgetData: Codable {
    let netWorthCents: Int
    let deltaCents: Int?
    let sparkline: [Int]
    let needsTaggingCount: Int
    let updatedAt: String

    static let placeholder = WidgetData(
        netWorthCents: 2_647_200, deltaCents: 598_915,
        sparkline: [2_050_000, 2_180_000, 2_260_000, 2_310_000, 2_470_000, 2_590_000, 2_647_200],
        needsTaggingCount: 1, updatedAt: ""
    )

    static func load() -> WidgetData? {
        guard
            let defaults = UserDefaults(suiteName: "group.com.jfmcapital.trackify"),
            let json = defaults.string(forKey: "trackify.widgetData"),
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }
}

struct Entry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: .now, data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, data: WidgetData.load() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let entry = Entry(date: .now, data: WidgetData.load() ?? .placeholder)
        // The app pushes fresh data on every open; the hourly refresh is a fallback.
        completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(3600))))
    }
}

func formatCents(_ cents: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = "USD"
    formatter.maximumFractionDigits = abs(cents) >= 1_000_000 ? 0 : 2
    return formatter.string(from: NSNumber(value: Double(cents) / 100)) ?? "$0"
}

struct SparklineShape: Shape {
    let values: [Int]

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard values.count > 1,
              let minValue = values.min(), let maxValue = values.max() else { return path }
        let span = CGFloat(max(maxValue - minValue, 1))
        let stepX = rect.width / CGFloat(values.count - 1)
        for (index, value) in values.enumerated() {
            let x = CGFloat(index) * stepX
            let y = rect.height - (CGFloat(value - minValue) / span) * rect.height
            if index == 0 { path.move(to: CGPoint(x: x, y: y)) }
            else { path.addLine(to: CGPoint(x: x, y: y)) }
        }
        return path
    }
}

struct NetWorthWidgetView: View {
    let entry: Entry
    @Environment(\.widgetFamily) private var family

    private var trendColor: Color {
        (entry.data.deltaCents ?? 0) < 0 ? .red : .green
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            VStack(spacing: 0) {
                Image(systemName: "tag.fill").font(.caption2)
                Text("\(entry.data.needsTaggingCount)").font(.headline).bold()
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("NET WORTH").font(.caption2).opacity(0.7)
                Text(formatCents(entry.data.netWorthCents)).font(.headline).bold()
                if entry.data.needsTaggingCount > 0 {
                    Text("\(entry.data.needsTaggingCount) to tag").font(.caption2)
                }
            }
        default:
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("trackify").font(.caption).bold()
                    Spacer()
                    if entry.data.needsTaggingCount > 0 {
                        Text("\(entry.data.needsTaggingCount) to tag")
                            .font(.caption2).bold()
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Color.red.opacity(0.15))
                            .foregroundColor(.red)
                            .clipShape(Capsule())
                    }
                }
                Spacer(minLength: 0)
                Text("NET WORTH").font(.caption2).opacity(0.6)
                Text(formatCents(entry.data.netWorthCents))
                    .font(family == .systemMedium ? .title : .title3)
                    .bold()
                    .minimumScaleFactor(0.6)
                if let delta = entry.data.deltaCents {
                    Text("\(delta >= 0 ? "▲" : "▼") \(formatCents(abs(delta)))")
                        .font(.caption2).bold()
                        .foregroundColor(trendColor)
                }
                if family == .systemMedium {
                    SparklineShape(values: entry.data.sparkline)
                        .stroke(trendColor, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
                        .frame(height: 34)
                }
            }
            .padding(2)
        }
    }
}

@main
struct TrackifyWidgetBundle: WidgetBundle {
    var body: some Widget {
        TrackifyWidget()
    }
}

struct TrackifyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TrackifyNetWorth", provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                NetWorthWidgetView(entry: entry).containerBackground(.background, for: .widget)
            } else {
                NetWorthWidgetView(entry: entry).padding()
            }
        }
        .configurationDisplayName("Net worth")
        .description("Your net worth, trend, and charges waiting to be tagged.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}
