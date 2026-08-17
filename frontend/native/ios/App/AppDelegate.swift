/**
 * AppDelegate — Capacitor's stock delegate plus trackify's native hooks:
 * notification-category registration at launch and the lock-screen tag
 * action handler. Replaces ios/App/App/AppDelegate.swift after
 * `npx cap add ios` (see ../README.md).
 */
import Capacitor
import UIKit
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        NotificationActions.register()
        return true
    }

    // Foreground pushes still show as banners — the feed updates on resume anyway.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // Our tag actions run here in the background; everything else
        // (including a plain tap) flows through to Capacitor's push plugin
        // so the JS deep-link path keeps working.
        if NotificationActions.handle(response, completion: completionHandler) { return }
        NotificationCenter.default.post(
            name: .capacitorDidReceiveNotificationResponse,
            object: response
        )
        completionHandler()
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application, continue: userActivity, restorationHandler: restorationHandler
        )
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken
        )
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications, object: error
        )
    }
}
