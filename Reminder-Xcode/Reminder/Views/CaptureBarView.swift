import SwiftUI

struct CaptureBarView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var speech = SpeechService()
    @State private var inputText = ""
    @State private var speechAuthorized = false

    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .leading) {
                if inputText.isEmpty && !speech.isListening {
                    Text("Enter your task")
                        .font(.custom("Patrick Hand SC", size: Theme.inputSize))
                        .foregroundColor(.black.opacity(0.35))
                }
                if speech.isListening {
                    Text(speech.transcript.isEmpty ? "Listening..." : speech.transcript)
                        .font(.custom("Patrick Hand SC", size: Theme.inputSize))
                        .foregroundColor(speech.transcript.isEmpty ? .black.opacity(0.35) : Theme.ink)
                        .lineLimit(1)
                } else {
                    TextField("", text: $inputText)
                        .textFieldStyle(.plain)
                        .font(.custom("Patrick Hand SC", size: Theme.inputSize))
                        .foregroundColor(Theme.ink)
                        .onSubmit { submit() }
                }
            }

            Button(action: toggleVoice) {
                Text(speech.isListening ? "⏹" : "🎙")
                    .font(.system(size: 28))
            }
            .buttonStyle(.plain)
            .help(speech.isListening ? "Stop listening" : "Voice capture")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .frame(height: 72)
        .overlay(
            RoundedRectangle(cornerRadius: 0)
                .stroke(speech.isListening ? Theme.inkBlue.opacity(0.5) : Theme.rule, lineWidth: speech.isListening ? 2 : 1)
        )
        .background(speech.isListening ? Theme.paper.opacity(0.95) : Theme.paper)
        .onAppear {
            speech.requestPermission { granted in
                speechAuthorized = granted
            }
        }
        .onChange(of: speech.isListening) { listening in
            // When speech stops, transfer transcript to input
            if !listening && !speech.transcript.isEmpty {
                inputText = speech.transcript
                speech.transcript = ""
                submit()
            }
        }
    }

    private func toggleVoice() {
        if speech.isListening {
            speech.stopListening()
        } else {
            if speechAuthorized {
                speech.startListening()
            } else {
                speech.requestPermission { granted in
                    speechAuthorized = granted
                    if granted {
                        speech.startListening()
                    }
                }
            }
        }
    }

    private func submit() {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        let parsed = TaskParser.parse(text, people: appState.people)
        appState.addTask(parsed: parsed)
        inputText = ""
    }
}
