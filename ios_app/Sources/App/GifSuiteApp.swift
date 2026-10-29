import SwiftUI

@main
struct GifSuiteApp: App {
    private let service: GifService

    init() {
        let configuredURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
        let baseURL = URL(string: configuredURL ?? "https://staging.gifsuite.com")!
        service = GifService(client: APIClient(baseURL: baseURL))
    }

    var body: some Scene {
        WindowGroup {
            AppTabView(service: service)
                .tint(GifSuiteColor.accent)
                .foregroundStyle(GifSuiteColor.text)
                .preferredColorScheme(.dark)
        }
    }
}
