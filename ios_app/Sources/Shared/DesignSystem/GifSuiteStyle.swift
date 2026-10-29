import SwiftUI

struct GifSuitePrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(GifSuiteColor.canvas)
            .background(configuration.isPressed ? GifSuiteColor.flare : GifSuiteColor.accent,
                        in: RoundedRectangle(cornerRadius: 16))
            .opacity(isEnabled ? 1 : 0.5)
    }
}

extension View {
    func gifSuiteCard() -> some View {
        background(GifSuiteColor.surface, in: RoundedRectangle(cornerRadius: 22))
            .overlay {
                RoundedRectangle(cornerRadius: 22)
                    .strokeBorder(GifSuiteColor.line, lineWidth: 1)
                    .allowsHitTesting(false)
            }
    }
}

struct GifSuiteEyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.caption.weight(.bold))
            .tracking(2)
            .foregroundStyle(GifSuiteColor.accent)
    }
}

/// Native geometry matching the provisional Burst Loop mark in lib/brand.mjs.
struct GifSuiteMark: View {
    var cutout = GifSuiteColor.canvas

    var body: some View {
        Canvas { context, size in
            draw(in: &context, size: size)
        }
        .accessibilityHidden(true)
    }

    private func draw(in context: inout GraphicsContext, size: CGSize) {
        let scale: Double = Double(min(size.width, size.height)) / 100
        let cx = Double(size.width) / 2
        let cy = Double(size.height) / 2
        var burst = Path()
        for i in 0..<240 {
            let angle: Double = Double(i) / 240 * Double.pi * 2 - Double.pi / 2
            let wave: Double = 0.5 + 0.5 * cos(8 * (angle + Double.pi / 2))
            let radius: Double = (0.6 + 0.4 * pow(wave, 0.85)) * 49 * scale
            let point = CGPoint(x: cx + cos(angle) * radius, y: cy + sin(angle) * radius)
            if i == 0 { burst.move(to: point) } else { burst.addLine(to: point) }
        }
        burst.closeSubpath()
        context.fill(burst, with: .color(GifSuiteColor.accent))
        var spiral = Path()
        for i in 0...82 {
            let t = Double(i) / 82
            let angle: Double = t * 1.7 * Double.pi * 2 - Double.pi / 2
            let radius: Double = (3 + 19 * t) * scale
            let point = CGPoint(x: cx + cos(angle) * radius, y: cy + sin(angle) * radius)
            if i == 0 { spiral.move(to: point) } else { spiral.addLine(to: point) }
        }
        context.stroke(spiral, with: .color(cutout), style: StrokeStyle(lineWidth: 7.5 * scale, lineCap: .round))
    }
}

/// A static fading dot band, kept separate from readable content.
struct GifSuiteHalftone: View {
    var body: some View {
        Canvas { context, size in
            for row in 0..<6 {
                let radius = CGFloat(6 - row) * 0.42
                for column in 0..<Int(size.width / 10) + 1 {
                    let x = CGFloat(column) * 10 + (row.isMultiple(of: 2) ? 0 : 5)
                    let dot = CGRect(x: x, y: CGFloat(row) * 8, width: radius * 2, height: radius * 2)
                    context.fill(Path(ellipseIn: dot), with: .color(GifSuiteColor.accent.opacity(0.5)))
                }
            }
        }
        .frame(height: 48)
        .clipped()
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }
}
