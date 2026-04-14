import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            // Top bar
            HStack {
                Text("Welcome back, Antara!")
                    .font(.custom("Patrick Hand SC", size: Theme.titleSize))
                    .foregroundColor(Theme.inkBlue)

                Spacer()

                HStack(spacing: 14) {
                    Button(action: {
                        appState.toggleGlobalMute()
                    }) {
                        Image(systemName: appState.globalMute ? "bell.slash.fill" : "bell.fill")
                            .font(.system(size: 18))
                            .foregroundColor(appState.globalMute ? Theme.muted : Theme.inkBlue)
                    }
                    .buttonStyle(.plain)
                    .help(appState.globalMute ? "Unmute all notifications" : "Mute all notifications")

                    DatePillView(dateString: appState.todayString)
                }
            }
            .padding(.horizontal, 28)
            .padding(.top, 22)
            .padding(.bottom, 14)

            Divider()
                .background(Theme.rule)

            // Main layout
            HStack(alignment: .top, spacing: 0) {
                // Left: capture + buckets
                VStack(spacing: 22) {
                    CaptureBarView()
                    BucketsView()
                }
                .padding(.trailing, 12)

                Divider()
                    .background(Theme.rule)

                // Right: calendar + urgent
                VStack(spacing: 24) {
                    CalendarSectionView()
                    UrgentSectionView()
                }
                .frame(width: 340)
                .padding(.leading, 24)
            }
            .padding(.horizontal, 28)
            .padding(.top, 20)
        }
        .background(Theme.paper)
        .frame(minWidth: 900, minHeight: 600)
    }
}

struct DatePillView: View {
    let dateString: String

    var body: some View {
        HStack(spacing: 18) {
            Text("Date")
                .foregroundColor(Theme.ink)
            Text(dateString)
                .foregroundColor(Theme.inkBlue)
        }
        .font(.custom("Patrick Hand SC", size: 22))
        .padding(.horizontal, 26)
        .padding(.vertical, 10)
        .overlay(
            RoundedRectangle(cornerRadius: 34)
                .stroke(Theme.rule, lineWidth: 1)
        )
    }
}
