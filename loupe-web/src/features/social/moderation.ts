/**
 * The client-side screening engine.
 *
 * **This is not enforcement.** The backend screens every write at one
 * chokepoint (`app/social/services/safety.enforce`) and is the only thing
 * that can actually refuse — anything decided here is skippable by anyone
 * who opens the network tab. What this buys is speed and manners: telling
 * someone their username will bounce while they are typing it, rather than
 * after they have filled in the bio, the location and four social links and
 * pressed Save.
 *
 * Offline on purpose. A wordlist catches the deliberate slur instantly, for
 * free, with no request and no vendor key in the browser — and the
 * deliberate slur is the case worth catching early. It cannot see images,
 * and it does not understand "I hate <group>" (no slur, no match); both of
 * those are the server's classifier's job, and it still runs on save.
 */

import {
  POLICY_PRESETS,
  PROFANITY_PRESET,
  createModerato,
  wordlistProvider,
} from "moderato";

export const moderationEngine = createModerato({
  provider: wordlistProvider(PROFANITY_PRESET),
});

/**
 * Handles, display names, collection names — text that becomes part of
 * someone's public identity. Stricter than a caption's policy, because
 * there is no reviewing a username after the fact: it is on every byline,
 * comment and follower row from the moment it saves. Mirrors
 * `moderation.IDENTITY` on the backend, which is what actually refuses.
 */
export const IDENTITY_POLICY = POLICY_PRESETS.identity;

/** What we say when we stop someone at the keyboard. Warmer than a refusal:
 *  nothing has been rejected yet, and most of these are one word away from
 *  fine. The backend owns the copy for an actual refusal. */
export const IDENTITY_HINT =
  "That name breaks the community rules — try a different one.";
