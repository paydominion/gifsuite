import SwiftUI

struct GifCard: View {
    let gif: Gif
    let posterURL: URL

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            AsyncImage(url: posterURL) { phase in
                if let image = phase.image {
                    image
                        .resizable()
                        .scaledToFit()
                } else if phase.error != nil {
                    ContentUnavailableView("Preview unavailable", systemImage: "photo")
                } else {
                    ProgressView()
                        .tint(GifSuiteColor.accent)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 220)
            .background(GifSuiteColor.panel, in: RoundedRectangle(cornerRadius: 18))
            .clipShape(RoundedRectangle(cornerRadius: 18))

            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline) {
                    Text(gif.authorName.isEmpty ? "@\(gif.authorHandle)" : gif.authorName)
                        .font(.headline)
                    Spacer()
                    Image(systemName: "repeat")
                        .foregroundStyle(GifSuiteColor.accent)
                        .accessibilityHidden(true)
                }
                Text(gif.tweetText.isEmpty ? "GIF from X" : gif.tweetText)
                    .font(.subheadline)
                    .foregroundStyle(GifSuiteColor.muted)
                    .lineLimit(3)
            }
        }
        .padding(14)
        .gifSuiteCard()
    }
}
