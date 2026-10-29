import Foundation
import Observation

@MainActor
@Observable
final class GrabViewModel {
    var postURL = ""
    var isSubmitting = false
    var message: String?
    var isError = false

    private let service: GifService

    init(service: GifService) {
        self.service = service
    }

    func grab() async {
        let trimmedURL = postURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedURL.isEmpty else { return }

        isSubmitting = true
        message = nil
        isError = false
        defer { isSubmitting = false }

        do {
            let result = try await service.grab(postURL: trimmedURL)
            message = result.created ? "GIF added to the timeline." : "That GIF is already in the timeline."
        } catch {
            message = error.localizedDescription
            isError = true
        }
    }
}
