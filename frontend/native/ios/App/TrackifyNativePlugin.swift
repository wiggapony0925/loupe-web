/**
 * TrackifyNative — the Capacitor ⇄ SwiftUI bridge plugin.
 *
 * `updateWidgetData` receives the JSON payload from src/native/widget.ts,
 * stores it in the App Group container (shared with the widget extension),
 * and asks WidgetKit to redraw. The JSON shape is a CONTRACT with
 * WidgetData in TrackifyWidget.swift — change them together.
 */
import Capacitor
import Foundation
import WidgetKit

let trackifyAppGroup = "group.com.jfmcapital.trackify"
let trackifyWidgetDataKey = "trackify.widgetData"

@objc(TrackifyNativePlugin)
public class TrackifyNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TrackifyNativePlugin"
    public let jsName = "TrackifyNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidgetData", returnType: CAPPluginReturnPromise)
    ]

    @objc func updateWidgetData(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("missing json")
            return
        }
        guard let defaults = UserDefaults(suiteName: trackifyAppGroup) else {
            call.reject("app group not configured")
            return
        }
        defaults.set(json, forKey: trackifyWidgetDataKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
