# GifSuite iOS starter

SwiftUI app shell for the GifSuite tools and public GIF timeline. The app targets iOS 17 and uses XcodeGen to keep the Xcode project reproducible from `project.yml`.

## Open the app

```sh
cd ios_app
xcodegen generate
open GifSuite.xcodeproj
```

The app currently points to `https://staging.gifsuite.com`. Change `INFOPLIST_KEY_API_BASE_URL` in `project.yml` to use another GifSuite deployment.

## Structure

```text
Sources/
  App/                  App entry point and tab navigation
  Core/Models/          API response models
  Core/Networking/      HTTP client and GifSuite endpoints
  Features/Grab/        X post link submission
  Features/Settings/    App and server configuration
  Features/Timeline/    Public GIF feed
  Features/Tools/       GIF tool directory
  Shared/Components/    Reusable feature UI
  Shared/DesignSystem/  Shared colors and layout values
```

The initial API integration uses `GET /api/gifs` and `POST /api/grab`. Convert and compress screens can be added under `Features/Tools` as those native flows are implemented.

## Native feature plan and web sync

- [Feature plan](FEATURE_PLAN.md): current web features translated into SwiftUI flows, API contracts and milestones aligned with the web roadmap.
- [Implementation backlog](BACKLOG.md): stable feature IDs, dependencies and acceptance criteria, with web readiness separate from native completion.
- [Sync trigger](SYNC.md): update these documents during web development, with an hourly Codex heartbeat as a fallback. The trigger updates the plan and backlog only; it does not write Swift implementation code.
