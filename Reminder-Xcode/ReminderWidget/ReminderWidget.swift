import WidgetKit
import SwiftUI

struct ReminderEntry: TimelineEntry {
    let date: Date
    let tasks: [ReminderTask]
}

struct ReminderWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> ReminderEntry {
        ReminderEntry(date: Date(), tasks: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (ReminderEntry) -> Void) {
        completion(ReminderEntry(date: Date(), tasks: SharedTaskStore.todaysTasks()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ReminderEntry>) -> Void) {
        let entry = ReminderEntry(date: Date(), tasks: SharedTaskStore.todaysTasks())
        // Refresh at next midnight so the widget updates for the new day
        let midnight = Calendar.current.startOfDay(
            for: Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        )
        let timeline = Timeline(entries: [entry], policy: .after(midnight))
        completion(timeline)
    }
}

@main
struct ReminderWidget: Widget {
    let kind = "ReminderWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ReminderWidgetProvider()) { entry in
            ReminderWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Deadlines")
        .description("Shows tasks due today.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
