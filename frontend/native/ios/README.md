# trackify iOS native layer — Mac setup runbook

Swift sources for the SwiftUI surfaces (widget, lock-screen tag actions)
that ride on the JS bridge. **Swift compiles only in Xcode**, so these files
live here in the repo and get wired into the generated iOS project on your
Mac. ~15 minutes, once.

## 0. Generate the iOS project

```bash
cd frontend
npm run build
npx cap add ios
npx cap sync
npx cap open ios
```

## 1. App Group (shares data between app and widget)

Xcode → **App** target → Signing & Capabilities → **+ App Groups** →
add `group.com.jfmcapital.trackify`. (Repeat for the widget target in step 3.)

## 2. Plugin + notification actions (App target)

1. Drag `App/TrackifyNativePlugin.swift` and `App/NotificationActions.swift`
   from this folder into the Xcode `App` group (✓ Copy items, target: App).
2. **Replace** the generated `App/App/AppDelegate.swift` with
   `App/AppDelegate.swift` from this folder.
3. Register the plugin: Capacitor 7 auto-registers `CAPBridgedPlugin`
   classes found in the app target — nothing else to do.
4. Info.plist → add key **`TrackifyAPIBaseURL`** (String) = your API origin,
   e.g. `https://trackify-api-xxxx.a.run.app`.
5. Push capability: Signing & Capabilities → **+ Push Notifications**
   (plus the usual Firebase `GoogleService-Info.plist` for FCM).

## 3. Widget extension

1. File → New → Target → **Widget Extension**, name `TrackifyWidget`,
   ☐ include configuration intent → Finish (don't activate the scheme prompt's
   "skip"— activate is fine).
2. Delete the template `TrackifyWidget.swift` it generated; drag in
   `TrackifyWidget/TrackifyWidget.swift` from this folder (target:
   TrackifyWidget).
3. Add the **same App Group** (`group.com.jfmcapital.trackify`) to the
   TrackifyWidget target's capabilities.
4. Build & run the App scheme once, open the app so it pushes widget data,
   then add the widget from the home-screen gallery.

## 4. Verify the lock-screen actions

1. Run on a real device, sign in, trigger a test ingest (README §Email
   forwarding, or curl the inbound webhook).
2. Long-press the arriving notification → **Mine / Partner's / Split 50/50**
   appear. Tapping one PATCHes the tag through `/v1/push-actions/tag`
   without opening the app; the feed shows the tag on next open.

## Contracts to keep in sync

| Swift | TypeScript / backend |
|---|---|
| `WidgetData` in `TrackifyWidget.swift` | `WidgetPayload` in `src/native/widget.ts` |
| `trackifyAppGroup` / data key in plugin | (same strings in widget) |
| Action ids `TAG_MINE/PARTNER/SPLIT` | `action` enum in `pushActionController.ts` |
| `TAG_TRANSACTION` category | `apns.payload.aps.category` in `pushService.ts` |

Troubleshooting: widget shows placeholder → App Group missing on one of the
two targets. Actions don't appear → category registered only after next app
launch; force-quit and reopen once. Action taps do nothing → check
`TrackifyAPIBaseURL` and that the push payload contains `actionKey`
(device must re-register once after this backend deploy).
