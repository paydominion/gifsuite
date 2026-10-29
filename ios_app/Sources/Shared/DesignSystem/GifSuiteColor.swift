import SwiftUI

enum GifSuiteColor {
    static let canvas = Color(hex: 0x111110)
    static let surface = Color(hex: 0x191917)
    static let panel = Color(hex: 0x21211e)
    static let line = Color(hex: 0x2e2d28)
    static let text = Color(hex: 0xf5f2e6)
    static let muted = Color(hex: 0xaaa695)
    static let accent = Color(hex: 0xffdc4a)
    static let flare = Color(hex: 0xffe600)
    static let danger = Color(hex: 0xff7a66)
    static let success = Color(hex: 0xb9e769)
}

private extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 255) / 255,
                  green: Double((hex >> 8) & 255) / 255,
                  blue: Double(hex & 255) / 255, opacity: 1)
    }
}
