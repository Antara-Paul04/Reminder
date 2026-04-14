import SwiftUI

struct PersonBlockView: View {
    @EnvironmentObject var appState: AppState
    let person: String
    let tasks: [ReminderTask]
    let bucket: TaskBucket

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(person == "Me" ? "My list" : "\(person)'s list")
                .font(.custom("Patrick Hand SC", size: 22))
                .textCase(.uppercase)
                .foregroundColor(Theme.inkBlue)
                .frame(height: Theme.lineHeight)
                .padding(.horizontal, 6)

            ForEach(tasks) { task in
                TaskItemView(task: task, showBadge: person != "Me", bucket: bucket)
            }
        }
        .padding(.bottom, Theme.lineHeight)
    }
}
