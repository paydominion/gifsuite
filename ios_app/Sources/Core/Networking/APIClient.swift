import Foundation

struct APIClient {
    let baseURL: URL

    func get<Response: Decodable>(
        _ path: String,
        queryItems: [URLQueryItem] = []
    ) async throws -> Response {
        var components = URLComponents(url: baseURL.appending(path: path), resolvingAgainstBaseURL: false)
        components?.queryItems = queryItems.isEmpty ? nil : queryItems
        guard let url = components?.url else { throw APIClientError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        return try await send(request)
    }

    func post<Payload: Encodable, Response: Decodable>(
        _ path: String,
        body: Payload
    ) async throws -> Response {
        let url = baseURL.appending(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        return try await send(request)
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw APIClientError.invalidResponse }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        guard (200..<300).contains(response.statusCode) else {
            let message = try? decoder.decode(APIErrorResponse.self, from: data).error
            throw APIClientError.server(message ?? "Request failed (\(response.statusCode)).")
        }

        return try decoder.decode(Response.self, from: data)
    }
}

enum APIClientError: LocalizedError {
    case invalidURL
    case invalidResponse
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: "The server URL is invalid."
        case .invalidResponse: "The server returned an invalid response."
        case .server(let message): message
        }
    }
}
