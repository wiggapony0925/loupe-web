import { Accordion } from "radix-ui";
import { ChevronDown, LifeBuoy } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components";
import { SitePage, SiteSection } from "../SitePage/SitePage";
import styles from "./Help.module.scss";

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: "How do I add a card to my collection?",
    a: "Open any card from the market and tap “Add to collection.” Pick the grading house (or RAW with a condition), enter the grade, how many copies you own, and optionally what you paid. It appears in your Vault and Analytics instantly.",
  },
  {
    q: "How do I edit or remove a card I own?",
    a: "In your Vault, tap the pencil on any card — or use “Manage” under the card on its market page. From there you can update the grade, cost basis, value, and notes, or remove the holding entirely. Removing a holding never deletes the card from the catalog.",
  },
  {
    q: "Where do prices come from?",
    a: "Prices are aggregated from public marketplaces and refreshed continuously. Valuations are grade-aware, so a PSA 10 and a raw copy of the same card are priced differently. Figures are indicative and dated — not investment advice.",
  },
  {
    q: "Is Loupe on mobile?",
    a: "Yes. The Loupe iOS app shares the same account and data as the web app, and adds on-device card scanning so you can grade and log cards with your camera.",
  },
  {
    q: "How accurate are the valuations?",
    a: "We model value from real, recent sales and listings, adjusted for grade and grading house. No model is perfect, so we always show the underlying market data and let you override any card's estimated value.",
  },
  {
    q: "Is there an API?",
    a: "Yes — the same backend that powers the apps has an interactive API reference. You'll find it under Developer API in the footer.",
  },
];

/** Help center — searchable-style FAQ plus a route to direct support. */
export function Help() {
  return (
    <SitePage
      eyebrow="Help center"
      title="How can we help?"
      lead="Answers to the questions collectors ask most. Still stuck? Our team is one message away."
      hero={
        <Link to="/contact">
          <Button size="lg" leadingIcon={<LifeBuoy size={16} />}>
            Contact support
          </Button>
        </Link>
      }
    >
      <SiteSection title="Frequently asked">
        <Accordion.Root type="single" collapsible className={styles.faq}>
          {FAQS.map((item, i) => (
            <Accordion.Item key={item.q} value={`item-${i}`} className={styles.faq__item}>
              <Accordion.Header>
                <Accordion.Trigger className={styles.faq__trigger}>
                  <span>{item.q}</span>
                  <ChevronDown className={styles.faq__chevron} size={18} />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className={styles.faq__content}>
                <p>{item.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </SiteSection>
    </SitePage>
  );
}
