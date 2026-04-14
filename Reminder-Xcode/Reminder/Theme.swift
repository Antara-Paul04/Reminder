import SwiftUI

struct Theme {
    static let paper = Color(red: 0.961, green: 0.949, blue: 0.914)       // #f5f2e9
    static let ink = Color(red: 0.118, green: 0.118, blue: 0.118)         // #1e1e1e
    static let inkBlue = Color(red: 0.063, green: 0.043, blue: 0.733)     // #100bbb
    static let rule = Color.black.opacity(0.12)
    static let line = Color.black.opacity(0.18)
    static let cell = Color.black.opacity(0.08)
    static let muted = Color.black.opacity(0.3)

    static let lineHeight: CGFloat = 44
    static let fontSize: CGFloat = 18
    static let headingSize: CGFloat = 24
    static let titleSize: CGFloat = 42
    static let inputSize: CGFloat = 26
}

// Notebook ruled-line background
struct RuledBackground: View {
    var body: some View {
        GeometryReader { geo in
            let count = Int(geo.size.height / Theme.lineHeight) + 1
            Path { path in
                for i in 1...count {
                    let y = CGFloat(i) * Theme.lineHeight
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: geo.size.width, y: y))
                }
            }
            .stroke(Theme.rule, lineWidth: 1)
        }
    }
}

func formatShortDate(_ ymdStr: String) -> String {
    let parts = ymdStr.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return ymdStr }
    let monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    let m = parts[1]
    let d = parts[2]
    guard m >= 1, m <= 12 else { return ymdStr }
    return "\(d) \(monthNames[m - 1])"
}
