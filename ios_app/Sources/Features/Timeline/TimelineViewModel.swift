import Foundation
import Observation

@MainActor
@Observable
final class TimelineViewModel {
    private(set) var items: [Gif] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let service: GifService
    private var hasLoaded = false

    init(service: GifService) {
        self.service = service
    }

    func loadIfNeeded() async {
        guard !hasLoaded else { return }
        await reload()
    }

    func reload() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let response = try await service.timeline()
            items = response.items
            hasLoaded = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    func posterURL(for gif: Gif) -> URL {
        service.posterURL(for: gif)
    }
}
