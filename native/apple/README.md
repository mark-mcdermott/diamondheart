# Native iOS — Widgets & Apple Watch

`ios/` is gitignored and regenerated via `npx cap add ios`. The source
files for the home-screen widget, the watch companion app, its
complication, and the Capacitor plugin that feeds them live here and are
wired into the Xcode project manually. Once wired, `cap sync` preserves
them across regenerations because they live outside `ios/App/App`.

## What's in this folder

```
native/apple/
├── Shared/
│   ├── StreakStore.swift      App Group UserDefaults read/write
│   └── BrandColors.swift      Quiet Ground palette (matches globals.css)
├── Plugins/WidgetSync/
│   ├── WidgetSyncPlugin.swift Capacitor plugin — writes snapshot, reloads timelines
│   └── WidgetSyncPlugin.m     CAP_PLUGIN registration
├── DiamondheartWidget/        Home-screen widget extension (small/medium + Lock Screen)
│   ├── DiamondheartWidgetBundle.swift
│   ├── StreakWidget.swift
│   ├── Info.plist
│   └── DiamondheartWidget.entitlements
└── DiamondheartWatch/         watchOS app + complication
    ├── DiamondheartWatchApp.swift
    ├── WatchRootView.swift
    ├── Complications/
    │   └── StreakComplication.swift
    ├── Info.plist
    └── DiamondheartWatch.entitlements
```

## One-time Xcode setup

Run from the repo root:

```bash
pnpm cap:sync      # generates/updates ios/
pnpm cap:ios       # opens Xcode
```

Then inside Xcode:

### 1. App Group

1. Select the **App** target → *Signing & Capabilities*.
2. `+ Capability` → **App Groups** → add `group.app.diamondheart.shared`.
3. Repeat for the widget target and the watch target after you create them.

### 2. Add the Capacitor plugin sources to the main app target

Drag `native/apple/Shared/StreakStore.swift` and
`native/apple/Plugins/WidgetSync/` into the **App** group in Xcode. Tick
*Create groups* and only the **App** target (we'll add the widget/watch
separately).

### 3. Widget extension

1. *File → New → Target… → Widget Extension*. Name it
   `DiamondheartWidget`. Uncheck "Include Configuration Intent".
2. Delete the template Swift files and `Assets.xcassets` placeholder the
   template generates.
3. Drag every file from `native/apple/DiamondheartWidget/` into the new
   target, replacing the generated `Info.plist` and entitlements.
4. Drag `native/apple/Shared/StreakStore.swift` and
   `native/apple/Shared/BrandColors.swift` into the widget target (tick
   only this target — do NOT duplicate into App's compilation).
5. *Signing & Capabilities* → enable App Groups → add
   `group.app.diamondheart.shared`.
6. Bundle identifier: `app.diamondheart.mobile.widget`.

### 4. Watch companion app

1. *File → New → Target… → Watch App* (for an existing iOS app).
   - Product name: `Diamondheart Watch App`
   - Bundle identifier: `app.diamondheart.mobile.watchkitapp`
   - Language: Swift, Interface: SwiftUI, Include Complication: **yes**
2. Delete the template content view.
3. Drag `DiamondheartWatchApp.swift`, `WatchRootView.swift`, and the
   `Shared/` files into the watch target. Replace `Info.plist` and the
   `.entitlements` with the ones in `native/apple/DiamondheartWatch/`.
4. *Signing & Capabilities* → App Groups → add
   `group.app.diamondheart.shared`.

### 5. Watch complication (Widget Extension embedded in the watch)

1. Select the watch app target → *Add Target → Widget Extension*.
   - Name: `DiamondheartComplication`
   - Product name: `Diamondheart Complication`
   - Platform: **watchOS** (not iOS)
2. Delete the template Swift files.
3. Drag `native/apple/DiamondheartWatch/Complications/StreakComplication.swift`
   plus the two `Shared/` files into this target.
4. App Groups → `group.app.diamondheart.shared`.

### 6. Sanity build

From the repo root:

```bash
pnpm build         # Next.js build
pnpm cap:sync      # copies web assets into ios/
```

In Xcode: select the **App** scheme and Run. Then switch to
`DiamondheartWidget` and Run — Xcode will attach to the widget gallery
and you can add the widget to the home screen in the simulator.

## Data flow

```
Dashboard loads
  → fetchWidgetSnapshot() → GET /api/widget/snapshot
  → syncStreakToWidgets(snapshot)
    → Capacitor JS bridge
      → WidgetSyncPlugin.write (Swift)
        → StreakStore.write   (App Group UserDefaults)
        → WidgetCenter.reloadAllTimelines()
          → StreakWidget.getTimeline reads StreakStore
          → StreakComplication.getTimeline reads StreakStore
```

The `/api/widget/snapshot` endpoint currently returns a placeholder
payload. Replace its body with real streak + today-progress queries once
you're ready — nothing else in the pipeline needs to change.

## Notes

- The widget refresh policy is hourly; WidgetKit may throttle this.
  `WidgetCenter.reloadAllTimelines()` in the plugin is the reliable
  path — it fires every time the phone app syncs.
- `accessoryInline` family on both watch and phone produces the simple
  Lock Screen / Smart Stack glance.
- Apple does **not** allow third-party watch faces — only
  complications. The "watch face" ask is met by making a great
  complication that users can drop onto any Apple-provided face.
