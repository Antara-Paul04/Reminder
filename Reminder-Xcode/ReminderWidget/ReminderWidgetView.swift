import SwiftUI
import WidgetKit

struct ReminderWidgetView: View {
    let entry: ReminderEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Today's Deadlines")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.primary)
                Spacer()
                Text("\(entry.tasks.count)")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.blue)
            }

            Divider()

            if entry.tasks.isEmpty {
                Spacer()
                Text("Nothing due today")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                Spacer()
            } else {
                ForEach(entry.tasks.prefix(5)) { task in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(task.urgent ? Color.red : Color.blue.opacity(0.6))
                            .frame(width: 6, height: 6)

                        Text(task.text)
                            .font(.system(size: 12))
                            .foregroundColor(.primary)
                            .lineLimit(1)

                        Spacer()

                        Text(task.person)
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }

                if entry.tasks.count > 5 {
                    Text("+\(entry.tasks.count - 5) more")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(12)
    }
}
