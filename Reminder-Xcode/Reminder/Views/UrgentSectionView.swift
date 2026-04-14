import SwiftUI

struct UrgentSectionView: View {
    @EnvironmentObject var appState: AppState
    @State private var isTargeted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Urgent!")
                .font(.custom("Patrick Hand SC", size: Theme.headingSize))
                .textCase(.uppercase)
                .foregroundColor(Theme.inkBlue)

            ZStack(alignment: .topLeading) {
                // Dotted background
                DottedBackground()

                VStack(alignment: .leading, spacing: 0) {
                    ForEach(appState.urgentTasks()) { task in
                        UrgentTaskRow(task: task)
                    }
                }
                .padding(4)
            }
            .frame(minHeight: 140)
            .background(isTargeted ? Theme.inkBlue.opacity(0.04) : Color.clear)
            .onDrop(of: [.text], isTargeted: $isTargeted) { providers in
                for provider in providers {
                    provider.loadObject(ofClass: NSString.self) { item, _ in
                        guard let idString = item as? String,
                              let uuid = UUID(uuidString: idString) else { return }
                        DispatchQueue.main.async {
                            let task = appState.tasks.first { $0.id == uuid }
                            if let task = task, !task.done {
                                appState.moveTask(uuid, urgent: true)
                            }
                        }
                    }
                }
                return true
            }
        }
    }
}

struct UrgentTaskRow: View {
    @EnvironmentObject var appState: AppState
    let task: ReminderTask
    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 10) {
            Button(action: { appState.toggleDone(task.id) }) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.black.opacity(0.32), lineWidth: 1)
                        .frame(width: 24, height: 24)
                    if task.done {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Theme.inkBlue)
                    }
                }
            }
            .buttonStyle(.plain)

            Text("\(task.text) (\(task.person))")
                .font(.custom("Patrick Hand SC", size: 20))
                .foregroundColor(Theme.inkBlue)
                .lineLimit(1)

            Spacer()

            if isHovered {
                Button(action: { appState.deleteTask(task.id) }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12))
                        .foregroundColor(.black.opacity(0.32))
                }
                .buttonStyle(.plain)
            }
        }
        .frame(height: Theme.lineHeight)
        .padding(.horizontal, 6)
        .contentShape(Rectangle())
        .onHover { isHovered = $0 }
        .onDrag {
            NSItemProvider(object: task.id.uuidString as NSString)
        }
    }
}

struct DottedBackground: View {
    var body: some View {
        GeometryReader { geo in
            let spacing: CGFloat = 28
            let cols = Int(geo.size.width / spacing) + 1
            let rows = Int(geo.size.height / spacing) + 1
            Canvas { context, _ in
                for row in 0..<rows {
                    for col in 0..<cols {
                        let point = CGPoint(x: CGFloat(col) * spacing + 4, y: CGFloat(row) * spacing + 4)
                        context.fill(
                            Circle().path(in: CGRect(x: point.x - 0.75, y: point.y - 0.75, width: 1.5, height: 1.5)),
                            with: .color(.black.opacity(0.25))
                        )
                    }
                }
            }
        }
    }
}
