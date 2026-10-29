import Foundation

struct Gif: Decodable, Identifiable {
    let id: String
    let authorName: String
    let authorHandle: String
    let tweetText: String
    let width: Int
    let height: Int
    let durationMs: Int
    let createdAt: Int
}

struct GifFeedResponse: Decodable {
    let items: [Gif]
    let nextCursor: Int?
}

struct GrabResponse: Decodable {
    let id: String
    let created: Bool
}

struct APIErrorResponse: Decodable {
    let error: String
}
