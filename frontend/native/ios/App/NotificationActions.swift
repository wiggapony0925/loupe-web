/**
 * Lock-screen tag actions — the swipe → buzz → tagged-in-one-press loop.
 *
 * Registers the TAG_TRANSACTION category (the backend sets it on every
 * charge push) with three actions. When the user taps one, the handler
 * POSTs to /v1/push-actions/tag using the per-device `actionKey` from the
 * push payload — no app launch, no Firebase token needed.
 *
 * API base URL comes from Info.plist key `TrackifyAPIBaseURL`.
 */
import Foundation
import UserNotifications

enum NotificationActions {
    static let category = "TAG_TRANSACTION"

    static func register() {
        let mine = UNNotificationAction(identifier: "TAG_MINE", title: "Mine", options: [])
        let partner = UNNotificationAction(identifier: "TAG_PARTNER", title: "Partner’s", options: [])
        let split = UNNotificationAction(identifier: "TAG_SPLIT", title: "Split 50/50", options: [])
        let tagCategory = UNNotificationCategory(
            identifier: category,
            actions: [mine, partner, split],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([tagCategory])
    }

    /// Returns true when the response was one of ours and was handled.
    static func handle(_ response: UNNotificationResponse, completion: @escaping () -> Void) -> Bool {
        let action: String
        switch response.actionIdentifier {
        case "TAG_MINE": action = "MINE"
        case "TAG_PARTNER": action = "PARTNER"
        case "TAG_SPLIT": action = "SPLIT"
        default: return false
        }

        let userInfo = response.notification.request.content.userInfo
        guard
            let transactionId = userInfo["transactionId"] as? String,
            let actionKey = userInfo["actionKey"] as? String,
            let base = Bundle.main.object(forInfoDictionaryKey: "TrackifyAPIBaseURL") as? String,
            let url = URL(string: "\(base)/v1/push-actions/tag")
        else {
            completion()
            return true
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "actionKey": actionKey,
            "transactionId": transactionId,
            "action": action,
        ])

        // Background-safe: finish the system callback whatever happens.
        let task = URLSession.shared.dataTask(with: request) { _, _, _ in
            DispatchQueue.main.async { completion() }
        }
        task.resume()
        return true
    }
}
