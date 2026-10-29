import SwiftUI

struct ToolsView: View {
    private let tools: [ToolItem] = [
        ToolItem(title: "Convert", detail: "GIF, MP4, WebM and WebP", symbol: "arrow.left.arrow.right", availability: "Coming soon"),
        ToolItem(title: "Compress", detail: "A smaller file. The same moment.", symbol: "arrow.down.right.and.arrow.up.left", availability: "Coming soon"),
        ToolItem(title: "Trim", detail: "Keep only the good part.", symbol: "scissors", availability: "Planned"),
        ToolItem(title: "Speed & loop", detail: "Slow it down. Play it backwards.", symbol: "hare", availability: "Planned"),
        ToolItem(title: "Make a GIF", detail: "Bring your photos and clips to life.", symbol: "sparkles", availability: "Planned")
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 10) {
                    GifSuiteEyebrow(text: "A little creative control")
                    Text("Big ideas.\nSmall files.")
                        .font(.largeTitle.weight(.black))
                        .tracking(-1)
                    Text("More ways to make a moment yours. Native tools are on their way.")
                        .foregroundStyle(GifSuiteColor.muted)
                }
                ForEach(tools) { tool in
                    HStack(alignment: .top, spacing: 16) {
                        Image(systemName: tool.symbol)
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(GifSuiteColor.accent)
                            .frame(width: 48, height: 48)
                            .background(GifSuiteColor.panel, in: RoundedRectangle(cornerRadius: 14))
                        VStack(alignment: .leading, spacing: 7) {
                            Text(tool.title).font(.headline)
                            Text(tool.detail)
                                .font(.subheadline)
                                .foregroundStyle(GifSuiteColor.muted)
                            Text(tool.availability.uppercased())
                                .font(.caption2.weight(.bold))
                                .tracking(1)
                                .foregroundStyle(GifSuiteColor.accent)
                                .padding(.horizontal, 9)
                                .padding(.vertical, 5)
                                .background(GifSuiteColor.accent.opacity(0.08), in: Capsule())
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(20)
                    .gifSuiteCard()
                    .accessibilityElement(children: .combine)
                }
                GifSuiteHalftone()
            }
            .padding(24)
            .frame(maxWidth: 680)
            .frame(maxWidth: .infinity)
        }
        .background(GifSuiteColor.canvas.ignoresSafeArea())
        .navigationTitle("Tools")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct ToolItem: Identifiable {
    let title: String
    let detail: String
    let symbol: String
    let availability: String
    var id: String { title }
}
