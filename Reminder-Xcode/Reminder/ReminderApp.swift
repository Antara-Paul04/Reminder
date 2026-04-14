import SwiftUI

@main
struct ReminderApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .onAppear {
                    NotificationService.shared.requestPermission()
                    NotificationService.shared.reschedule(
                        tasks: appState.tasks,
                        globalMute: appState.globalMute
                    )
                }
        }
        .windowStyle(.titleBar)
        .defaultSize(width: 1100, height: 720)
    }
}
