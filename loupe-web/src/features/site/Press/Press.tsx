import { Mail } from "lucide-react";
import { Button } from "@/components";
import { SitePage, SiteSection, SiteProse } from "../SitePage/SitePage";
import { PRESS_EMAIL } from "@/lib/site";

/** Press & media — boilerplate, quick facts, and a media contact. */
export function Press() {
  return (
    <SitePage
      eyebrow="Press"
      title="Press & media"
      lead="Writing about collectibles, fintech, or trading cards? Here's everything you need — and a direct line to our team."
      hero={
        <a href={`mailto:${PRESS_EMAIL}?subject=${encodeURIComponent("Press inquiry")}`}>
          <Button size="lg" leadingIcon={<Mail size={16} />}>
            Email the press team
          </Button>
        </a>
      }
    >
      <SiteSection title="Quick facts">
        <SiteProse>
          <ul>
            <li>
              <strong>What it is:</strong> Loupe is a forensic card-intelligence platform — real-time
              prices, grade-aware valuations, and a portfolio-style vault for trading cards.
            </li>
            <li>
              <strong>Platforms:</strong> Web and iOS, one account, fully synced.
            </li>
            <li>
              <strong>Coverage:</strong> Pokémon, Magic: The Gathering, Yu-Gi-Oh!, Lorcana, One Piece,
              and Digimon, with live pricing from connected marketplaces.
            </li>
          </ul>
        </SiteProse>
      </SiteSection>

      <SiteSection title="Boilerplate">
        <SiteProse>
          <p>
            Loupe gives collectors the tooling investors take for granted. By aggregating public
            marketplace data and pairing it with grade-aware valuation models, Loupe turns a
            collection into a live, trackable portfolio — so collectors always know what their cards
            are worth, where to buy, and how their holdings are trending.
          </p>
        </SiteProse>
      </SiteSection>
    </SitePage>
  );
}
