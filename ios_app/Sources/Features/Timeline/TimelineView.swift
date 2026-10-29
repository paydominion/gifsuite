import SwiftUI

struct TimelineView: View {
    @State private var model: TimelineViewModel

    init(service: GifService) {
        _model = State(initialValue: TimelineViewModel(service: service))
    }

    var body: some View {
        Group {
            if model.isLoading && model.items.isEmpty {
                ProgressView("Loading GIFs…")
                    .tint(GifSuiteColor.accent)
            } else if let error = model.error, model.items.isEmpty {
                ContentUnavailableView {
                    Label("Timeline unavailable", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(error)
                } actions: {
                    Button("Try again") { Task { await model.reload() } }
                        .buttonStyle(GifSuitePrimaryButtonStyle())
                        .frame(maxWidth: 240)
                }
            } else if model.items.isEmpty {
                ContentUnavailableView("No GIFs yet", systemImage: "play.rectangle", description: Text("Grab an X post to start the timeline."))
            } else {
                List(model.items) { gif in
                    GifCard(gif: gif, posterURL: model.posterURL(for: gif))
                        .listRowSeparator(.hidden)
                        .listRowBackground(GifSuiteColor.canvas)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .refreshable { await model.reload() }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(GifSuiteColor.canvas.ignoresSafeArea())
        .navigationTitle("Timeline")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.loadIfNeeded() }
    }
}
