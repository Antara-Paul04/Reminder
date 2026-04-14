import Foundation

struct ParsedInput {
    var text: String
    var person: String?
    var direction: TaskDirection
    var bucket: TaskBucket
    var deadline: String?
    var urgent: Bool
}

struct TaskParser {
    static let personAliases: [String: String] = [
        "prag": "Pragadees",
        "praga": "Pragadees",
        "pragadeesh": "Pragadees",
        "pradesh": "Pragadees",
        // Common speech-to-text mishearings
        "satan": "Setal",
        "shetal": "Setal",
        "sital": "Setal",
        "seetal": "Setal",
        "settle": "Setal",
        "rahool": "Rahul",
        "raul": "Rahul",
        "amaan": "Aman",
        "omon": "Aman",
        "asheel": "Ashil",
        "neeriage": "Neeraj",
        "neerage": "Neeraj",
        "vishnu": "Vishnu",
    ]

    static let months: [String: Int] = [
        "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
        "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
        "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
        "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
    ]

    static let fillerPhrases: [String] = [
        "told me to", "told me", "asked me to", "asked me",
        "wants me to", "wanted me to", "needs me to", "needed me to",
        "said to", "said i should", "said i have to", "said i need to",
        "i need to", "i have to", "i should", "i must", "i will", "i'll",
        "remind me to", "remind me", "reminder to", "remember to",
        "for me to", "for me", "gave me", "give me",
        "please", "pls", "plz",
        "by next week", "next week", "this week", "by today", "by tomorrow",
        "by eod", "eod", "asap", "today", "tomorrow",
        "on monday", "on tuesday", "on wednesday", "on thursday", "on friday", "on saturday", "on sunday",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
        "about", "regarding", "re:", "hey", "btw",
        "urgent", "urgently", "asap", "right away", "immediately", "high priority", "priority",
    ]

    static func parse(_ text: String, people: [String]) -> ParsedInput {
        let lower = text.lowercased()
        let tokens = lower.components(separatedBy: .whitespaces).filter { !$0.isEmpty }

        // --- Person ---
        var person: String? = nil
        var personToken: String? = nil

        // Exact match
        for p in people {
            if lower.range(of: "\\b\(p.lowercased())\\b", options: .regularExpression) != nil {
                person = p
                personToken = p.lowercased()
                break
            }
        }

        // Alias match (includes speech-to-text mishearings)
        if person == nil {
            for (alias, full) in personAliases {
                if lower.range(of: "\\b\(alias)\\b", options: .regularExpression) != nil {
                    person = full
                    personToken = alias
                    break
                }
            }
        }

        // Fuzzy match
        if person == nil {
            let wordTokens = lower.matches(of: /[a-z]+/).map { String(lower[$0.range]) }
            var bestPerson: String? = nil
            var bestDist = Int.max
            for tok in wordTokens where tok.count >= 3 {
                for p in people {
                    let pl = p.lowercased()
                    let dist = levenshtein(tok, pl)
                    let tolerance = max(2, pl.count / 3)
                    if dist <= tolerance && dist < bestDist {
                        bestPerson = p
                        bestDist = dist
                        personToken = tok
                    }
                }
            }
            person = bestPerson
        }

        // --- Direction ---
        var direction: TaskDirection = .theyOweMe
        let incomingPattern = "\\b(asked me|told me|wants me|wanted me|needs me|needed me|gave me|for me|i need to|i have to|i should|i must|remind me|reminder for me)\\b"
        let outgoingPattern = "\\b(remind|tell|ask|follow up|followup|ping|chase|nudge|reach out|get back to|message|msg|text|call|email|mail)\\b"

        var isOutgoing = false
        if lower.range(of: incomingPattern, options: .regularExpression) != nil {
            direction = .iOweThem
        } else if lower.range(of: outgoingPattern, options: .regularExpression) != nil {
            direction = .theyOweMe
            isOutgoing = true
        }

        // If outgoing (tell/remind/ask someone), it's MY task — keep person name in text
        let mentionedPerson = person
        if isOutgoing && person != nil && person != "Me" {
            person = nil // will become "Me" in addTask
            personToken = nil // don't strip the name from the text
        }

        // --- Deadline / Bucket ---
        var bucket: TaskBucket = .agenda
        var deadline: String? = nil
        let today = Date()
        let calendar = Calendar.current

        // "30th april" / "april 30" patterns
        let monthPattern = months.keys.joined(separator: "|")
        let dmyPattern = "\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(\(monthPattern))(?:\\s+(\\d{2,4}))?\\b"
        let mdyPattern = "\\b(\(monthPattern))\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{2,4}))?\\b"

        if let match = lower.range(of: dmyPattern, options: .regularExpression) {
            let matched = String(lower[match])
            deadline = parseDateFromMatch(matched, format: .dayMonth, today: today)
        } else if let match = lower.range(of: mdyPattern, options: .regularExpression) {
            let matched = String(lower[match])
            deadline = parseDateFromMatch(matched, format: .monthDay, today: today)
        }

        // Bare ordinal: "30th", "21st"
        if deadline == nil, let match = lower.range(of: "\\b(\\d{1,2})(st|nd|rd|th)\\b", options: .regularExpression) {
            let matched = String(lower[match])
            let digits = matched.filter { $0.isNumber }
            if let day = Int(digits), day >= 1, day <= 31 {
                var comps = calendar.dateComponents([.year, .month], from: today)
                comps.day = day
                if let candidate = calendar.date(from: comps), candidate < today {
                    comps.month! += 1
                    if comps.month! > 12 {
                        comps.month = 1
                        comps.year! += 1
                    }
                }
                if let d = calendar.date(from: comps) {
                    deadline = ymd(d)
                }
            }
        }

        // Weekday names → next occurrence of that day
        let weekdays: [String: Int] = [
            "sunday": 1, "monday": 2, "tuesday": 3, "wednesday": 4,
            "thursday": 5, "friday": 6, "saturday": 7,
        ]
        if deadline == nil {
            for (name, weekday) in weekdays {
                if lower.range(of: "\\b\(name)\\b", options: .regularExpression) != nil {
                    let todayWeekday = calendar.component(.weekday, from: today)
                    var daysAhead = weekday - todayWeekday
                    if daysAhead <= 0 { daysAhead += 7 }
                    deadline = ymd(calendar.date(byAdding: .day, value: daysAhead, to: today)!)
                    break
                }
            }
        }

        // Relative keywords
        if lower.contains("today") {
            if deadline == nil { deadline = ymd(today) }
            bucket = .today
        } else if lower.contains("tomorrow") {
            if deadline == nil { deadline = ymd(calendar.date(byAdding: .day, value: 1, to: today)!) }
        } else if lower.contains("next week") {
            if deadline == nil { deadline = ymd(calendar.date(byAdding: .day, value: 7, to: today)!) }
        }

        // --- Urgency ---
        var urgent = false
        if lower.range(of: "\\b(urgent|urgently|asap|right away|immediately|priority|high priority)\\b", options: .regularExpression) != nil {
            urgent = true
        }

        // --- Clean text ---
        var cleanText = text
        if let pt = personToken {
            cleanText = cleanText.replacingOccurrences(
                of: "\\b\(NSRegularExpression.escapedPattern(for: pt))\\b",
                with: " ",
                options: [.regularExpression, .caseInsensitive]
            )
        }
        let sorted = fillerPhrases.sorted { $0.count > $1.count }
        for phrase in sorted {
            let escaped = NSRegularExpression.escapedPattern(for: phrase)
            cleanText = cleanText.replacingOccurrences(
                of: "\\b\(escaped)\\b",
                with: " ",
                options: [.regularExpression, .caseInsensitive]
            )
        }
        // Strip date matches too
        if deadline != nil {
            let datePatterns = [dmyPattern, mdyPattern, "\\b\\d{1,2}(?:st|nd|rd|th)\\b"]
            for pat in datePatterns {
                cleanText = cleanText.replacingOccurrences(of: pat, with: " ", options: [.regularExpression, .caseInsensitive])
            }
            // Strip weekday names
            let weekdayPattern = "\\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b"
            cleanText = cleanText.replacingOccurrences(of: weekdayPattern, with: " ", options: [.regularExpression, .caseInsensitive])
        }
        cleanText = cleanText
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet.whitespaces.union(.punctuationCharacters))
        // Strip leading filler words
        if let range = cleanText.range(of: "^(to|the|a|that|and)\\s+", options: [.regularExpression, .caseInsensitive]) {
            cleanText.removeSubrange(range)
        }
        // Strip trailing prepositions
        if let range = cleanText.range(of: "\\s+(by|on|at|for|in|before|until)$", options: [.regularExpression, .caseInsensitive]) {
            cleanText.removeSubrange(range)
        }
        cleanText = cleanText.trimmingCharacters(in: .whitespaces)

        return ParsedInput(
            text: cleanText.isEmpty ? text : cleanText,
            person: person,
            direction: direction,
            bucket: bucket,
            deadline: deadline,
            urgent: urgent
        )
    }

    // MARK: - Helpers

    enum DateFormat { case dayMonth, monthDay }

    static func parseDateFromMatch(_ match: String, format: DateFormat, today: Date) -> String? {
        let parts = match.lowercased()
            .replacingOccurrences(of: "st|nd|rd|th", with: "", options: .regularExpression)
            .components(separatedBy: .whitespaces)
            .filter { !$0.isEmpty }

        guard parts.count >= 2 else { return nil }

        let dayStr: String
        let monthStr: String
        let yearStr: String?

        switch format {
        case .dayMonth:
            dayStr = parts[0]
            monthStr = parts[1]
            yearStr = parts.count > 2 ? parts[2] : nil
        case .monthDay:
            monthStr = parts[0]
            dayStr = parts[1]
            yearStr = parts.count > 2 ? parts[2] : nil
        }

        guard let day = Int(dayStr), let month = months[monthStr] else { return nil }

        let calendar = Calendar.current
        var year = calendar.component(.year, from: today)
        if let ys = yearStr, let y = Int(ys) {
            year = y < 100 ? 2000 + y : y
        } else {
            var comps = DateComponents(year: year, month: month, day: day)
            if let candidate = calendar.date(from: comps), candidate < today {
                year += 1
            }
        }

        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    static func ymd(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    static func levenshtein(_ a: String, _ b: String) -> Int {
        if a == b { return 0 }
        let m = a.count, n = b.count
        if m == 0 { return n }
        if n == 0 { return m }

        let aChars = Array(a)
        let bChars = Array(b)
        var dp = Array(0...n)

        for i in 1...m {
            var prev = dp[0]
            dp[0] = i
            for j in 1...n {
                let tmp = dp[j]
                if aChars[i - 1] == bChars[j - 1] {
                    dp[j] = prev
                } else {
                    dp[j] = 1 + min(prev, dp[j], dp[j - 1])
                }
                prev = tmp
            }
        }
        return dp[n]
    }
}
