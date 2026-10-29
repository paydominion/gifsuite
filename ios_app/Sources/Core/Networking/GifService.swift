import Foundation

struct GifService {
    let client: APIClient

    func timeline(before cursor: Int? = nil) async throws -> GifFeedResponse {
        var queryItems = [URLQueryItem(name: "limit", value: "24")]
        if let cursor {
            queryItems.append(URLQueryItem(name: "before", value: String(cursor)))
        }
        return try await client.get("api/gifs", queryItems: queryItems)
    }

    func grab(postURL: String) async throws -> GrabResponse {
        try await client.post("api/grab", body: GrabRequest(url: postURL))
    }

    func posterURL(for gif: Gif) -> URL {
        client.baseURL.appending(path: "media/\(gif.id)/poster.jpg")
    }
}

private struct GrabRequest: Encodable {
    let url: String
}
