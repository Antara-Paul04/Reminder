import Foundation
import UserNotifications

class NotificationService {
    static let shared = NotificationService()

    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
        }
    }

    func reschedule(tasks: [ReminderTask], globalMute: Bool) {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        guard !globalMute else { return }

        let calendar = Calendar.current
        guard !calendar.isDateInWeekend(Date()) else { return }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let todayStr = formatter.string(from: Date())

        let eligibleTasks = tasks.filter {
            $0.deadline == todayStr && !$0.done && !$0.muted
        }

        guard !eligibleTasks.isEmpty else { return }

        let now = Date()
        let hours = [14, 17] // 2pm and 5pm

        for hour in hours {
            // Skip if this time has already passed
            var triggerComps = calendar.dateComponents([.year, .month, .day], from: now)
            triggerComps.hour = hour
            triggerComps.minute = 0
            guard let triggerDate = calendar.date(from: triggerComps),
                  triggerDate > now else { continue }

            let taskSummary = eligibleTasks.map { "• \($0.text) (\($0.person))" }.joined(separator: "\n")
            let count = eligibleTasks.count

            let content = UNMutableNotificationContent()
            content.title = "📋 \(count) task\(count == 1 ? "" : "s") due today"
            content.body = taskSummary
            content.sound = .default

            let trigger = UNCalendarNotificationTrigger(
                dateMatching: DateComponents(hour: hour, minute: 0),
                repeats: false
            )

            let request = UNNotificationRequest(
                identifier: "reminder-\(hour)",
                content: content,
                trigger: trigger
            )

            center.add(request) { error in
                if let error = error {
                    print("Failed to schedule \(hour):00 notification: \(error)")
                }
            }
        }
    }
}
