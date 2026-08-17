/**
 * Widget bridge — feeds the SwiftUI WidgetKit extension.
 *
 * The custom `TrackifyNative` plugin (see native/ios/) writes this payload
 * into the App Group container and asks WidgetKit to reload timelines, so
 * the home-screen / lock-screen widgets always show the latest net worth
 * and needs-tagging count. On web or before the native plugin ships in a
 * binary, every call is a silent no-op — the loupe lazy-bridge rule.
 *
 * The JSON shape is a CONTRACT with WidgetData in TrackifyWidget.swift —
 * change them together.
 */
import { registerPlugin } from '@capacitor/core';
import { isNative } from './platform';

export interface WidgetPayload {
  netWorthCents: number;
  deltaCents: number | null;
  /** Sparkline values in cents, oldest → newest, ≤ 24 points. */
  sparkline: number[];
  needsTaggingCount: number;
  updatedAt: string;
}

interface TrackifyNativePlugin {
  updateWidgetData(options: { json: string }): Promise<void>;
}

const TrackifyNative = registerPlugin<TrackifyNativePlugin>('TrackifyNative');

export async function pushWidgetData(payload: WidgetPayload): Promise<void> {
  if (!isNative()) return;
  try {
    await TrackifyNative.updateWidgetData({ json: JSON.stringify(payload) });
  } catch {
    // Plugin not compiled into this binary yet — fine, the app still works.
  }
}
