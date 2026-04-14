import SwiftUI

struct BucketsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            // Due Today bucket
            BucketColumn(title: "Today's Deadlines", bucket: .today)

            Divider()
                .background(Theme.rule)
                .padding(.horizontal, 12)

            // Agendas bucket
            BucketColumn(
                title: appState.filterDate != nil
                    ? "Tasks for \(formatShortDate(appState.filterDate!))"
                    : "Agendas",
                bucket: .agenda
            )
        }
    }
}

struct BucketColumn: View {
    @EnvironmentObject var appState: AppState
    let title: String
    let bucket: TaskBucket
    @State private var isTargeted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.custom("Patrick Hand SC", size: Theme.headingSize))
                .textCase(.uppercase)
                .foregroundColor(Theme.ink)
                .padding(.bottom, 16)

            GeometryReader { geo in
                ZStack(alignment: .topLeading) {
                    RuledBackground()
                        .frame(height: geo.size.height)

                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ForEach(appState.orderedPeople(), id: \.self) { person in
                                let tasks = appState.tasksForBucket(bucket, person: person)
                                if !tasks.isEmpty {
                                    PersonBlockView(person: person, tasks: tasks, bucket: bucket)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                        .frame(maxWidth: .infinity, alignment: .topLeading)
                    }
                }
            }
            .background(
                isTargeted ? Theme.inkBlue.opacity(0.04) : Color.clear
            )
            .onDrop(of: [.text], isTargeted: $isTargeted) { providers in
                handleDrop(providers: providers)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func handleDrop(providers: [NSItemProvider]) -> Bool {
        for provider in providers {
            provider.loadObject(ofClass: NSString.self) { item, _ in
                guard let idString = item as? String,
                      let uuid = UUID(uuidString: idString) else { return }
                DispatchQueue.main.async {
                    appState.moveTask(uuid, bucket: bucket, urgent: false)
                }
            }
        }
        return true
    }
}
