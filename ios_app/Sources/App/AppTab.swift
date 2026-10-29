import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case grab
    case tools
    case timeline
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .grab: "Grab"
        case .tools: "Tools"
        case .timeline: "Timeline"
        case .settings: "Settings"
        }
    }

    var symbol: String {
        switch self {
        case .grab: "link"
        case .tools: "wand.and.stars"
        case .timeline: "play.rectangle.on.rectangle"
        case .settings: "gearshape"
        }
    }

    @ViewBuilder
    func makeView(service: GifService) -> some View {
        switch self {
        case .grab:
            GrabView(service: service)
        case .tools:
            ToolsView()
        case .timeline:
            TimelineView(service: service)
        case .settings:
            SettingsView(serverURL: service.client.baseURL)
        }
    }
}

struct AppTabView: View {
    let service: GifService
    @State private var selection: AppTab = .grab

    var body: some View {
        TabView(selection: $selection) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    tab.makeView(service: service)
                        .toolbarBackground(GifSuiteColor.canvas, for: .navigationBar)
                        .toolbarBackground(.visible, for: .navigationBar)
                }
                .tabItem {
                    Label(tab.title, systemImage: tab.symbol)
                }
                .tag(tab)
            }
        }
        .toolbarBackground(GifSuiteColor.surface, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
    }
}
