import SwiftUI

struct CalendarSectionView: View {
    @EnvironmentObject var appState: AppState
    @State private var displayedMonth = Date()

    private let daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
    private let calendar = Calendar.current

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Text("Your Calendar")
                    .font(.custom("Patrick Hand SC", size: Theme.headingSize))
                    .textCase(.uppercase)
                    .foregroundColor(Theme.inkBlue)

                Spacer()

                HStack(spacing: 12) {
                    Button("‹") { shiftMonth(-1) }
                        .buttonStyle(.plain)
                        .foregroundColor(Theme.inkBlue)
                        .font(.custom("Patrick Hand SC", size: 22))

                    Text(monthLabel)
                        .font(.custom("Patrick Hand SC", size: 18))
                        .foregroundColor(Theme.inkBlue)
                        .frame(minWidth: 110, alignment: .center)

                    Button("›") { shiftMonth(1) }
                        .buttonStyle(.plain)
                        .foregroundColor(Theme.inkBlue)
                        .font(.custom("Patrick Hand SC", size: 22))
                }
            }

            // Day-of-week header
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
                ForEach(daysOfWeek, id: \.self) { day in
                    Text(day)
                        .font(.custom("Patrick Hand SC", size: 14))
                        .textCase(.uppercase)
                        .foregroundColor(Theme.ink)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 4)
                }
            }
            .overlay(
                Rectangle().stroke(Theme.cell, lineWidth: 1)
            )

            // Calendar grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
                ForEach(calendarCells(), id: \.ymd) { cell in
                    CalendarCellView(cell: cell)
                        .onTapGesture {
                            if cell.hasTask && !cell.isToday {
                                if appState.filterDate == cell.ymd {
                                    appState.filterDate = nil
                                } else {
                                    appState.filterDate = cell.ymd
                                }
                            }
                        }
                }
            }
            .overlay(
                Rectangle().stroke(Theme.cell, lineWidth: 1)
            )
        }
    }

    private var monthLabel: String {
        let f = DateFormatter()
        f.dateFormat = "MMM yyyy"
        return f.string(from: displayedMonth)
    }

    private func shiftMonth(_ delta: Int) {
        if let next = calendar.date(byAdding: .month, value: delta, to: displayedMonth) {
            displayedMonth = next
        }
    }

    struct CalendarCell: Identifiable {
        let id = UUID()
        let day: Int
        let ymd: String
        let isMuted: Bool
        let isToday: Bool
        let isSelected: Bool
        let hasTask: Bool
    }

    private func calendarCells() -> [CalendarCell] {
        let year = calendar.component(.year, from: displayedMonth)
        let month = calendar.component(.month, from: displayedMonth)

        let firstOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1))!
        let startDay = calendar.component(.weekday, from: firstOfMonth) - 1 // 0=Sun
        let daysInMonth = calendar.range(of: .day, in: .month, for: firstOfMonth)!.count
        let prevMonthDays = calendar.range(of: .day, in: .month, for: calendar.date(byAdding: .month, value: -1, to: firstOfMonth)!)!.count

        let today = Date()
        let todayComps = calendar.dateComponents([.year, .month, .day], from: today)

        var cells: [CalendarCell] = []
        for i in 0..<42 {
            let dayNum: Int
            let cellMonth: Int
            let cellYear: Int
            let isMuted: Bool

            if i < startDay {
                dayNum = prevMonthDays - startDay + i + 1
                cellMonth = month - 1 < 1 ? 12 : month - 1
                cellYear = month - 1 < 1 ? year - 1 : year
                isMuted = true
            } else if i >= startDay + daysInMonth {
                dayNum = i - startDay - daysInMonth + 1
                cellMonth = month + 1 > 12 ? 1 : month + 1
                cellYear = month + 1 > 12 ? year + 1 : year
                isMuted = true
            } else {
                dayNum = i - startDay + 1
                cellMonth = month
                cellYear = year
                isMuted = false
            }

            let ymd = String(format: "%04d-%02d-%02d", cellYear, cellMonth, dayNum)
            let isToday = cellYear == todayComps.year && cellMonth == todayComps.month && dayNum == todayComps.day
            let isSelected = appState.filterDate == ymd
            let hasTask = appState.hasTaskOnDate(ymd)

            cells.append(CalendarCell(day: dayNum, ymd: ymd, isMuted: isMuted, isToday: isToday, isSelected: isSelected, hasTask: hasTask))
        }
        return cells
    }
}

struct CalendarCellView: View {
    let cell: CalendarSectionView.CalendarCell

    var body: some View {
        ZStack(alignment: .topLeading) {
            Rectangle()
                .fill(cell.isToday ? Theme.inkBlue : Color.clear)

            if cell.isSelected {
                Rectangle()
                    .stroke(Theme.inkBlue, lineWidth: 2)
            }

            Text("\(cell.day)")
                .font(.custom("Patrick Hand SC", size: 14))
                .foregroundColor(
                    cell.isToday ? Theme.paper :
                    cell.isMuted ? Theme.muted :
                    Theme.ink
                )
                .padding(.horizontal, 4)
                .padding(.vertical, 2)

            if cell.hasTask {
                Circle()
                    .fill(cell.isToday ? Theme.paper : Theme.inkBlue)
                    .frame(width: 5, height: 5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(7.0/6.0, contentMode: .fill)
        .overlay(
            Rectangle().stroke(Theme.cell, lineWidth: 0.5)
        )
        .contentShape(Rectangle())
        .cursor(cell.hasTask && !cell.isToday ? .pointingHand : .arrow)
    }
}

extension View {
    func cursor(_ cursor: NSCursor) -> some View {
        self.onHover { inside in
            if inside {
                cursor.push()
            } else {
                NSCursor.pop()
            }
        }
    }
}
