import { Navigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { SitePage, SiteProse } from "../SitePage/SitePage";
import { SUPPORT_EMAIL } from "@/lib/site";

type Doc = "terms" | "privacy" | "cookies";

const LAST_UPDATED = "June 1, 2026";

const DOCS: Record<Doc, { title: string; lead: string; body: ReactNode }> = {
  terms: {
    title: "Terms of Service",
    lead: "The agreement between you and Loupe when you use our apps and services.",
    body: (
      <>
        <h2>1. Using Loupe</h2>
        <p>
          By creating an account or using Loupe, you agree to these terms. You must be able to form a
          binding contract to use the service, and you're responsible for activity under your account.
        </p>
        <h2>2. Your collection data</h2>
        <p>
          The cards, grades, and notes you add are yours. You grant us the limited rights needed to
          store, display, and back up that data so the service works across your devices.
        </p>
        <h2>3. Pricing & valuations</h2>
        <p>
          Prices and valuations are aggregated from public marketplaces, are indicative, and may be
          delayed or inaccurate. They are <strong>not</strong> investment advice. Decisions you make
          based on this data are your own.
        </p>
        <h2>4. Acceptable use</h2>
        <p>
          Don't abuse, scrape, reverse-engineer, or disrupt the service, and don't use it to break the
          law. We may suspend accounts that do.
        </p>
        <h2>5. Changes</h2>
        <p>
          We may update these terms as the product evolves. We'll post the revised date here and, for
          material changes, notify you in-app.
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    lead: "What we collect, why, and the control you have over your data.",
    body: (
      <>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong> — your email and display name, used to sign you in.
          </li>
          <li>
            <strong>Collection data</strong> — the cards and details you add to your vault.
          </li>
          <li>
            <strong>Usage data</strong> — basic, privacy-respecting analytics to improve the product.
          </li>
        </ul>
        <h2>How we use it</h2>
        <p>
          To run the service, sync your data across devices, and improve Loupe. We do not sell your
          personal data.
        </p>
        <h2>Your rights</h2>
        <p>
          You can access, export, or delete your data at any time. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and
          we'll help.
        </p>
      </>
    ),
  },
  cookies: {
    title: "Cookie Policy",
    lead: "How Loupe uses cookies and local storage in your browser.",
    body: (
      <>
        <h2>What we store</h2>
        <ul>
          <li>
            <strong>Essential</strong> — your session token, kept so you stay signed in. Loupe doesn't
            work without it.
          </li>
          <li>
            <strong>Preferences</strong> — small settings like your light/dark theme.
          </li>
          <li>
            <strong>Analytics</strong> — aggregate, privacy-respecting usage measurement.
          </li>
        </ul>
        <h2>Managing cookies</h2>
        <p>
          You can clear cookies and local storage from your browser settings at any time. Doing so will
          sign you out and reset your preferences.
        </p>
      </>
    ),
  },
};

/** Legal documents (Terms / Privacy / Cookies), one route per `:doc`. */
export function Legal() {
  const { doc } = useParams<{ doc: string }>();
  if (!doc || !(doc in DOCS)) return <Navigate to="/legal/terms" replace />;
  const { title, lead, body } = DOCS[doc as Doc];

  return (
    <SitePage eyebrow={`Last updated ${LAST_UPDATED}`} title={title} lead={lead}>
      <SiteProse>{body}</SiteProse>
    </SitePage>
  );
}
