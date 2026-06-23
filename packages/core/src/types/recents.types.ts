/** Cross-device recents (recent searches + recently-viewed). Device-local on
 *  each client; synced for signed-in users via `GET/PUT /v1/me/recents`. */

export interface RecentViewedItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  setName?: string | null;
  kind: "card" | "sealed";
}

export interface Recents {
  searches: string[];
  viewed: RecentViewedItem[];
}
