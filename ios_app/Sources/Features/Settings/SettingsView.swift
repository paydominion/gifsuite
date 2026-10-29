import SwiftUI

struct SettingsView: View {
    let serverURL: URL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 14) {
                    GifSuiteMark().frame(width: 72, height: 72)
                    Text("Made for the loop.")
                        .font(.largeTitle.weight(.black))
                        .tracking(-1)
                    Text("A little suite for your favourite moments.")
                        .foregroundStyle(GifSuiteColor.muted)
                }
                .padding(.top, 12)

                VStack(alignment: .leading, spacing: 20) {
                    GifSuiteEyebrow(text: "Connection")
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Server", systemImage: "network").font(.headline)
                        Text(serverURL.absoluteString)
                            .font(.subheadline.monospaced())
                            .foregroundStyle(GifSuiteColor.muted)
                            .textSelection(.enabled)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
                .gifSuiteCard()

                VStack(alignment: .leading, spacing: 20) {
                    GifSuiteEyebrow(text: "About")
                    LabeledContent("App", value: "GifSuite for iOS")
                    Divider().overlay(GifSuiteColor.line)
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                }
                .padding(20)
                .gifSuiteCard()

                GifSuiteHalftone()
                Text("Not affiliated with X Corp.")
                    .font(.footnote)
                    .foregroundStyle(GifSuiteColor.muted)
            }
            .padding(24)
            .frame(maxWidth: 600)
            .frame(maxWidth: .infinity)
        }
        .background(GifSuiteColor.canvas.ignoresSafeArea())
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}
