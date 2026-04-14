import Foundation

struct SharedTaskStore {
    static let suiteName = "group.com.antara.reminder"
    static let storageKey = "reminders.state"

    private struct StoredState: Codable {
        var people: [String]
        var tasks: [ReminderTask]
        var globalMute: Bool?
    }

    static func loadTasks() -> [ReminderTask] {
        guard let defaults = UserDefaults(suiteName: suiteName),
              let data = defaults.data(forKey: storageKey),
              let stored = try? JSONDecoder().decode(StoredState.self, from: data)
        else { return [] }
        return stored.tasks
    }

    static func todaysTasks() -> [ReminderTask] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())
        return loadTasks().filter { $0.deadline == today && !$0.done }
    }
}
