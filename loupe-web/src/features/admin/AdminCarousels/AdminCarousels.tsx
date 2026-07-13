/**
 * Admin: carousel control room.
 *
 * The BACKEND owns every shelf both clients render (`/v1/public/carousels`):
 * a checked-in JSON registry + live operator overrides (kv-backed, no
 * migration) + the daily AI-designed shelves. This page is the operator's
 * one place to see and steer all of it — toggle/edit/add/delete recipes,
 * kill or force-regenerate the AI, and inspect the raw JSON the registry
 * actually serves.
 */
import { useState } from "react";
import { Plus, RefreshCw, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import {
  useAdminCarousels,
  useCreateCarousel,
  useDeleteCarousel,
  useRegenerateCarousels,
  useResetCarousel,
  useSetCarouselAi,
  useUpdateCarousel,
  type AdminCarouselRecipe,
  type CarouselRecipeCreate,
} from "@loupe/core";
import {
  Badge,
  Button,
  IconButton,
  Modal,
  Skeleton,
  Switch,
  TextField,
  useConfirm,
} from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminCarousels.module.scss";
import admin from "../admin.module.scss";

/** Compact "what it filters" summary so the table reads at a glance. */
function recipeLens(r: AdminCarouselRecipe): string {
  const bits: string[] = [r.source];
  if (r.priceMin != null || r.priceMax != null) {
    bits.push(`$${r.priceMin ?? 0}–${r.priceMax != null ? `$${r.priceMax}` : "∞"}`);
  }
  if (r.rarityPattern) bits.push(`rarity ~ ${r.rarityPattern}`);
  if (r.sort) bits.push(r.sort.replace("_", " "));
  return bits.join(" · ");
}

const EMPTY_DRAFT: CarouselRecipeCreate = {
  id: "",
  title: "",
  subtitle: "",
  source: "value",
};

export function AdminCarousels() {
  const { data, isLoading } = useAdminCarousels();
  const setAi = useSetCarouselAi();
  const update = useUpdateCarousel();
  const create = useCreateCarousel();
  const reset = useResetCarousel();
  const del = useDeleteCarousel();
  const regenerate = useRegenerateCarousels();
  const confirm = useConfirm();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CarouselRecipeCreate>(EMPTY_DRAFT);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  async function toggleAi() {
    if (!data) return;
    const turningOn = !data.aiEnabled;
    const ok = await confirm({
      title: turningOn ? "Enable AI shelves?" : "Pin every game to the registry?",
      tone: turningOn ? "mint" : "danger",
      confirmLabel: turningOn ? "Enable AI" : "Curated only",
      message: turningOn ? (
        <>
          Games serve the daily <strong>AI-designed</strong> shelves again
          (regenerated once per day per game).
        </>
      ) : (
        <>
          Every game serves <strong>only the registry below</strong> and model
          calls stop entirely — the AI kill switch.
        </>
      ),
    });
    if (!ok) return;
    setAi.mutate(turningOn, {
      onSuccess: () =>
        notify.success(turningOn ? "AI shelves enabled." : "Pinned to curated registry."),
      onError: (e) => notify.error(e.message),
    });
  }

  function regenerateGame(game: string, label: string) {
    setRegenerating(game);
    regenerate.mutate(game, {
      onSuccess: () => notify.success(`Fresh AI shelves designed for ${label}.`),
      onError: (e) => notify.error(e.message),
      onSettled: () => setRegenerating(null),
    });
  }

  async function removeRecipe(r: AdminCarouselRecipe) {
    const ok = await confirm({
      title: `Delete “${r.title}”?`,
      tone: "danger",
      confirmLabel: "Delete",
      message:
        r.origin === "file" ? (
          <>
            File recipes are <strong>tombstoned</strong> — the row stays here
            (restorable via reset) but stops serving immediately.
          </>
        ) : (
          <>Operator-added recipe — this removes it permanently.</>
        ),
    });
    if (!ok) return;
    del.mutate(r.id, {
      onSuccess: () => notify.success(`“${r.title}” deleted.`),
      onError: (e) => notify.error(e.message),
    });
  }

  function submitDraft() {
    if (!draft.id || !draft.title || !draft.subtitle) {
      notify.error("id, title, and subtitle are required.");
      return;
    }
    create.mutate(draft, {
      onSuccess: () => {
        notify.success(`“${draft.title}” added — serving now.`);
        setAdding(false);
        setDraft(EMPTY_DRAFT);
      },
      onError: (e) => notify.error(e.message),
    });
  }

  if (isLoading || !data) {
    return (
      <div className={admin.page}>
        <Skeleton height={120} />
        <Skeleton height={320} />
      </div>
    );
  }

  return (
    <div className={admin.page}>
      <header className={admin.head}>
        <div>
          <h1 className={admin.title}>Carousels</h1>
          <p className={admin.sub}>
            The registry + AI shelves both storefronts render. Backend-owned;
            clients only display.
          </p>
        </div>
        <div className={styles.aiSwitch}>
          <Badge tone={data.aiConfigured ? "mint" : "neutral"}>
            <Sparkles size={12} />
            {data.aiConfigured ? "model configured" : "no model key"}
          </Badge>
          <label className={styles.aiLabel}>
            AI shelves
            <Switch aria-label="AI shelves" checked={data.aiEnabled} onCheckedChange={toggleAi} />
          </label>
        </div>
      </header>

      {/* Per-game serve preview — what /v1/public/carousels answers right now. */}
      <div className={styles.games}>
        {data.games.map((g) => (
          <div key={g.id} className={styles.game}>
            <div className={styles.game__head}>
              <span className={styles.game__label}>{g.label}</span>
              <Badge tone={g.activeSource === "ai" ? "mint" : "neutral"}>
                {g.activeSource === "ai" ? "AI" : "curated"}
              </Badge>
            </div>
            <span className={styles.game__counts}>
              {g.curatedCount} curated
              {g.aiCount != null ? ` · ${g.aiCount} AI` : ""}
              {g.catalogOnly ? " · catalog-only" : ""}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!data.aiConfigured || !data.aiEnabled || regenerating !== null}
              leadingIcon={<RefreshCw size={14} />}
              onClick={() => regenerateGame(g.id, g.label)}
            >
              {regenerating === g.id ? "Designing…" : "Regenerate AI"}
            </Button>
          </div>
        ))}
      </div>

      {/* The registry — every recipe, live-editable. */}
      <div className={styles.tableHead}>
        <h2 className={admin.h2}>Registry</h2>
        <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setAdding(true)}>
          Add carousel
        </Button>
      </div>
      <div className={styles.rows}>
        {data.recipes.map((r) => (
          <div key={r.id} className={styles.row} data-removed={r.removed || undefined}>
            <div className={styles.row__main}>
              <div className={styles.row__title}>
                <strong>{r.title}</strong>
                <span className={styles.row__id}>{r.id}</span>
                <Badge tone={r.origin === "custom" ? "mint" : "neutral"}>
                  {r.origin}
                </Badge>
                {r.edited && <Badge tone="amber">edited</Badge>}
                {r.removed && <Badge tone="rose">deleted</Badge>}
              </div>
              <span className={styles.row__sub}>{r.subtitle}</span>
              <span className={styles.row__lens}>
                {recipeLens(r)} · {r.games ? r.games.join(", ") : "all priced games"}
              </span>
            </div>
            <div className={styles.row__actions}>
              <Switch
                aria-label={`Enable ${r.title}`}
                checked={r.enabled && !r.removed}
                disabled={r.removed}
                onCheckedChange={(enabled) =>
                  update.mutate(
                    { id: r.id, patch: { enabled } },
                    { onError: (e) => notify.error(e.message) },
                  )
                }
              />
              {r.origin === "file" && (r.edited || r.removed) && (
                <IconButton
                  label="Reset to checked-in state"
                  onClick={() =>
                    reset.mutate(r.id, {
                      onSuccess: () => notify.success(`“${r.title}” restored.`),
                      onError: (e) => notify.error(e.message),
                    })
                  }
                >
                  <RotateCcw size={15} />
                </IconButton>
              )}
              {!r.removed && (
                <IconButton label="Delete recipe" onClick={() => removeRecipe(r)}>
                  <Trash2 size={15} />
                </IconButton>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Today's AI designs, per game — read-only (regenerate to replace). */}
      {Object.keys(data.ai).length > 0 && (
        <>
          <h2 className={admin.h2}>Today&rsquo;s AI shelves</h2>
          <div className={styles.aiShelves}>
            {Object.entries(data.ai).map(([game, shelves]) => (
              <div key={game} className={styles.game}>
                <span className={styles.game__label}>{game}</span>
                <ul className={styles.aiList}>
                  {shelves.map((c) => (
                    <li key={c.id}>
                      <strong>{c.title}</strong> — {c.subtitle}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {/* The raw document — exactly what the registry serves. */}
      <details className={styles.raw}>
        <summary>Raw registry JSON</summary>
        <pre>{JSON.stringify({ recipes: data.recipes, ai: data.ai }, null, 2)}</pre>
      </details>

      <Modal open={adding} onOpenChange={setAdding} title="Add carousel">
        <div className={styles.form}>
          <TextField
            label="id"
            value={draft.id}
            onChange={(e) => setDraft({ ...draft, id: e.target.value })}
            placeholder="vintage-holos"
          />
          <TextField
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Vintage holo classics"
          />
          <TextField
            label="Subtitle"
            value={draft.subtitle}
            onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
            placeholder="Iconic {label} holos from the early sets."
          />
          <label className={styles.select}>
            Source
            <select
              value={draft.source}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  source: e.target.value as CarouselRecipeCreate["source"],
                })
              }
            >
              <option value="value">value (priced pool)</option>
              <option value="trending">trending</option>
              <option value="catalog">catalog (works for unpriced games)</option>
            </select>
          </label>
          <div className={styles.formRow}>
            <TextField
              label="Min $"
              value={draft.priceMin != null ? String(draft.priceMin) : ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  priceMin: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <TextField
              label="Max $"
              value={draft.priceMax != null ? String(draft.priceMax) : ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  priceMax: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <TextField
            label="Rarity pattern (regex, optional)"
            value={draft.rarityPattern ?? ""}
            onChange={(e) => setDraft({ ...draft, rarityPattern: e.target.value || null })}
            placeholder="secret|rainbow|illustration"
          />
          <TextField
            label="Games (comma-separated; blank = all priced)"
            value={draft.games?.join(", ") ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                games: e.target.value.trim()
                  ? e.target.value
                      .split(",")
                      .map((g) => g.trim().toLowerCase())
                      .filter(Boolean)
                  : null,
              })
            }
            placeholder="pokemon, magic"
          />
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={submitDraft} disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add carousel"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
