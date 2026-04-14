import Foundation

enum TaskDirection: String, Codable {
    case theyOweMe = "they_owe_me"
    case iOweThem = "i_owe_them"
}

enum TaskBucket: String, Codable {
    case today
    case agenda
}

struct ReminderTask: Identifiable, Codable, Equatable, Hashable {
    let id: UUID
    var text: String
    var person: String
    var direction: TaskDirection
    var bucket: TaskBucket
    var deadline: String? // yyyy-MM-dd
    var urgent: Bool
    var done: Bool
    var muted: Bool
    var createdAt: Date

    init(
        text: String,
        person: String,
        direction: TaskDirection = .theyOweMe,
        bucket: TaskBucket = .agenda,
        deadline: String? = nil,
        urgent: Bool = false
    ) {
        self.id = UUID()
        self.text = text
        self.person = person
        self.direction = direction
        self.bucket = bucket
        self.deadline = deadline
        self.urgent = urgent
        self.done = false
        self.muted = false
        self.createdAt = Date()
    }

    // Backward-compatible decoding for existing persisted data
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        text = try container.decode(String.self, forKey: .text)
        person = try container.decode(String.self, forKey: .person)
        direction = try container.decode(TaskDirection.self, forKey: .direction)
        bucket = try container.decode(TaskBucket.self, forKey: .bucket)
        deadline = try container.decodeIfPresent(String.self, forKey: .deadline)
        urgent = try container.decode(Bool.self, forKey: .urgent)
        done = try container.decode(Bool.self, forKey: .done)
        muted = try container.decodeIfPresent(Bool.self, forKey: .muted) ?? false
        createdAt = try container.decode(Date.self, forKey: .createdAt)
    }
}
