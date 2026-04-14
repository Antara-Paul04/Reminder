import SwiftUI

struct TaskItemView: View {
    @EnvironmentObject var appState: AppState
    let task: ReminderTask
    let showBadge: Bool
    let bucket: TaskBucket
    @State private var isEditing = false
    @State private var editText = ""
    @State private var isHovered = false

    // Vertical padding so that text + padding = multiple of 44px per line
    // Patrick Hand 20pt has ~24px natural line height; (44-24)/2 = 10px each side
    private let vPad: CGFloat = 10
    private let textLineSpacing: CGFloat = 20 // 44 - 24 = 20

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            // Checkbox — pinned to first line
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.black.opacity(0.32), lineWidth: 1)
                    .frame(width: 24, height: 24)

                if task.done {
                    TickMarkShape()
                        .stroke(Theme.inkBlue, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                        .frame(width: 32, height: 30)
                        .offset(x: 0, y: -8)
                }
            }
            .frame(width: 34, height: 34, alignment: .center)
            .padding(.top, vPad - 4)
            .contentShape(Rectangle())
            .onTapGesture {
                appState.toggleDone(task.id)
            }

            // Task text
            if isEditing {
                TextField("", text: $editText, onCommit: {
                    appState.editTaskText(task.id, newText: editText)
                    isEditing = false
                })
                .textFieldStyle(.plain)
                .font(.custom("Patrick Hand", size: 20))
                .foregroundColor(Theme.inkBlue)
                .padding(.vertical, vPad)
                .onExitCommand {
                    isEditing = false
                }
            } else {
                Text(displayText)
                    .font(.custom("Patrick Hand", size: 20))
                    .foregroundColor(Theme.inkBlue)
                    .strikethrough(task.done, color: Theme.inkBlue)
                    .lineSpacing(textLineSpacing)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.vertical, vPad)
                    .onTapGesture(count: 2) {
                        editText = task.text
                        isEditing = true
                    }
            }

            // Direction badge — right after text
            if showBadge {
                Image(systemName: task.direction == .iOweThem ? "arrow.down.left" : "arrow.up.right")
                    .font(.system(size: 14))
                    .foregroundColor(Theme.inkBlue.opacity(task.done ? 0.5 : 1))
                    .padding(.top, vPad + 4)
                    .help(task.direction == .iOweThem ? "Incoming — they asked you" : "Outgoing — you need to push")
            }

            Spacer()

            // Mute & Delete buttons
            if isHovered {
                HStack(spacing: 8) {
                    Button(action: {
                        appState.toggleMute(task.id)
                    }) {
                        Image(systemName: task.muted ? "bell.slash.fill" : "bell.fill")
                            .font(.system(size: 12))
                            .foregroundColor(task.muted ? Theme.inkBlue.opacity(0.5) : .black.opacity(0.32))
                    }
                    .buttonStyle(.plain)
                    .help(task.muted ? "Unmute notifications" : "Mute notifications")

                    Button(action: {
                        appState.deleteTask(task.id)
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 12))
                            .foregroundColor(.black.opacity(0.32))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, vPad + 4)
            }
        }
        .padding(.horizontal, 6)
        .contentShape(Rectangle())
        .onHover { isHovered = $0 }
        .onDrag {
            NSItemProvider(object: task.id.uuidString as NSString)
        }
    }

    private var displayText: String {
        var text = task.text
        if bucket == .agenda, let deadline = task.deadline {
            text += " (\(formatShortDate(deadline)))"
        }
        return text
    }
}

// Hand-drawn tick mark from the SVG asset, scaled to fit a 32x30 frame
struct TickMarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 39.0
        let sy = rect.height / 36.0
        var path = Path()
        path.move(to: CGPoint(x: 1.0 * sx, y: 28.06 * sy))
        path.addCurve(
            to: CGPoint(x: 5.32 * sx, y: 27.21 * sy),
            control1: CGPoint(x: 1.61 * sx, y: 27.34 * sy),
            control2: CGPoint(x: 3.88 * sx, y: 26.70 * sy)
        )
        path.addCurve(
            to: CGPoint(x: 10.09 * sx, y: 34.41 * sy),
            control1: CGPoint(x: 8.46 * sx, y: 28.89 * sy),
            control2: CGPoint(x: 9.62 * sx, y: 34.36 * sy)
        )
        path.addCurve(
            to: CGPoint(x: 12.54 * sx, y: 30.89 * sy),
            control1: CGPoint(x: 10.42 * sx, y: 34.44 * sy),
            control2: CGPoint(x: 10.76 * sx, y: 33.71 * sy)
        )
        path.addCurve(
            to: CGPoint(x: 21.44 * sx, y: 17.91 * sy),
            control1: CGPoint(x: 14.31 * sx, y: 28.08 * sy),
            control2: CGPoint(x: 17.47 * sx, y: 23.00 * sy)
        )
        path.addCurve(
            to: CGPoint(x: 32.83 * sx, y: 5.05 * sy),
            control1: CGPoint(x: 25.42 * sx, y: 12.81 * sy),
            control2: CGPoint(x: 30.11 * sx, y: 7.84 * sy)
        )
        path.addCurve(
            to: CGPoint(x: 36.52 * sx, y: 1.48 * sy),
            control1: CGPoint(x: 35.54 * sx, y: 2.25 * sy),
            control2: CGPoint(x: 36.12 * sx, y: 1.77 * sy)
        )
        path.addCurve(
            to: CGPoint(x: 37.33 * sx, y: 1.0 * sy),
            control1: CGPoint(x: 36.92 * sx, y: 1.18 * sy),
            control2: CGPoint(x: 37.12 * sx, y: 1.09 * sy)
        )
        return path
    }
}
