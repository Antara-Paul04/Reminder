import Foundation
import SwiftUI

class AppState: ObservableObject {
    static let seedPeople = ["Setal", "Rahul", "Pragadees", "Aman", "Anand", "Ashil", "Neeraj", "Vishnu"]
    private static let storageKey = "reminders.state"

    @Published var people: [String] = []
    @Published var tasks: [ReminderTask] = []
    @Published var filterDate: String? = nil
    @Published var globalMute: Bool = false

    init() {
        load()
    }

    // MARK: - Persistence

    struct StoredState: Codable {
        var people: [String]
        var tasks: [ReminderTask]
        var globalMute: Bool?
    }

    func load() {
        guard let data = UserDefaults.standard.data(forKey: Self.storageKey),
              let stored = try? JSONDecoder().decode(StoredState.self, from: data) else {
            people = Self.seedPeople
            tasks = []
            return
        }
        people = stored.people.isEmpty ? Self.seedPeople : stored.people
        tasks = stored.tasks
        globalMute = stored.globalMute ?? false
    }

    func save() {
        let stored = StoredState(people: people, tasks: tasks, globalMute: globalMute)
        if let data = try? JSONEncoder().encode(stored) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
        NotificationService.shared.reschedule(tasks: tasks, globalMute: globalMute)
    }

    // MARK: - Mute Operations

    func toggleMute(_ id: UUID) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].muted.toggle()
        save()
    }

    func toggleGlobalMute() {
        globalMute.toggle()
        save()
    }

    // MARK: - Task Operations

    func addTask(parsed: ParsedInput) {
        var person = parsed.person ?? "Me"
        if person == "Me" && !people.contains("Me") {
            people.insert("Me", at: 0)
        }
        let task = ReminderTask(
            text: parsed.text,
            person: person,
            direction: parsed.direction,
            bucket: parsed.bucket,
            deadline: parsed.deadline,
            urgent: parsed.urgent
        )
        tasks.append(task)
        save()
    }

    func toggleDone(_ id: UUID) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].done.toggle()
        if tasks[idx].done && tasks[idx].urgent {
            tasks[idx].urgent = false
        }
        save()
    }

    func flipDirection(_ id: UUID) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].direction = tasks[idx].direction == .theyOweMe ? .iOweThem : .theyOweMe
        save()
    }

    func deleteTask(_ id: UUID) {
        tasks.removeAll { $0.id == id }
        save()
    }

    func editTaskText(_ id: UUID, newText: String) {
        let trimmed = newText.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty {
            deleteTask(id)
            return
        }
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[idx].text = trimmed
        save()
    }

    func moveTask(_ id: UUID, person: String? = nil, bucket: TaskBucket? = nil, urgent: Bool? = nil) {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return }
        if let person = person { tasks[idx].person = person }
        if let bucket = bucket { tasks[idx].bucket = bucket }
        if let urgent = urgent { tasks[idx].urgent = urgent }
        save()
    }

    // MARK: - Filtered Data

    func tasksForBucket(_ bucket: TaskBucket, person: String) -> [ReminderTask] {
        tasks.filter { t in
            guard t.person == person, !t.urgent else { return false }
            if bucket == .agenda, let filter = filterDate {
                return t.deadline == filter
            }
            return t.bucket == bucket
        }
    }

    func urgentTasks() -> [ReminderTask] {
        tasks.filter { $0.urgent && !$0.done }
    }

    func orderedPeople() -> [String] {
        var ordered = people.sorted { a, b in
            if a == "Me" { return true }
            if b == "Me" { return false }
            return false
        }
        return ordered
    }

    var todayString: String {
        let f = DateFormatter()
        f.dateFormat = "dd-MM-yy"
        return f.string(from: Date())
    }

    var todayYMD: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    func todaysDeadlineTasks() -> [ReminderTask] {
        let today = todayYMD
        return tasks.filter { $0.deadline == today && !$0.done }
    }

    func hasTaskOnDate(_ ymd: String) -> Bool {
        tasks.contains { !$0.done && $0.deadline == ymd }
    }
}
