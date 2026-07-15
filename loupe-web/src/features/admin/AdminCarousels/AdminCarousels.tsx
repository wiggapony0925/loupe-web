import { useState } from "react";
import { Plus, RefreshCw, RotateCcw, Sparkles, SquarePen, Trash2 } from "lucide-react";
import {
  useAdminCarousels,
  useUpdateCarousel,
  useCreateCarousel,
  useDeleteCarousel,
  useResetCarousel,
  useSetCarouselAi,
  useRegenerateCarousels,
  type AdminCarouselRecipe,
  type AdminCarouselGame,
  type CarouselRecipeCreate,
} from "@loupe/core";
import { Button, Skeleton, NoteCard, Modal, TextField, IconButton, Switch, SegmentedControl, useConfirm } from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminCarousels.module.scss";
import admin from "../admin.module.scss";

type Source = "value" | "trending" | "catalog";
type Sort = "price_desc" | "price_asc" | "name";

interface RecipeForm {
  id: string;
  title: string;
  subtitle: string;
  source: Source;
  priceMin: string;
  priceMax: string;
  rarityPattern: string;
  sort: Sort;
  limit: string;
  scoped: boolean;
  games: string[];
  enabled: boolean;
}

const EMPTY_FORM: RecipeForm = {
  id: "",
  title: "",
  subtitle: "",
  source: "value",
  priceMin: "",
  priceMax: "",
  rarityPattern: "",
  sort: "price_desc",
  limit: "20",
  scoped: false,
  games: [],
  enabled: true,
};

function toForm(r: AdminCarouselRecipe): RecipeForm {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    source: r.source,
    priceMin: r.priceMin != null ? String(r.priceMin) : "",
    priceMax: r.priceMax != null ? String(r.priceMax) : "",
    rarityPattern: r.rarityPattern ?? "",
    sort: r.sort ?? "price_desc",
    limit: r.limit != null ? String(r.limit) : "20",
    scoped: r.games != null,
    games: r.games ?? [],
    enabled: r.enabled,
  };
}

/** Form → wire payload. Numbers are cleared with an explicit null so the
 *  backend patch actually unsets them (missing fields are left unchanged). */
function toPayload(form: RecipeForm): CarouselRecipeCreate {
  const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));
  return {
    id: form.id.trim(),
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    source: form.source,
    priceMin: num(form.priceMin),
    priceMax: num(form.priceMax),
    rarityPattern: form.rarityPattern.trim() === "" ? null : form.rarityPattern.trim(),
    sort: form.sort,
    limit: num(form.limit) ?? 20,
    enabled: form.enabled,
    games: form.scoped ? form.games : null,
  };
}

/** "$250+", "$25–$150", "under $5" — the shelf's price window at a glance. */
function priceWindow(r: AdminCarouselRecipe): string | null {
  if (r.priceMin != null && r.priceMax != null) return `$${r.priceMin}–$${r.priceMax}`;
  if (r.priceMin != null) return `$${r.priceMin}+`;
  if (r.priceMax != null) return `under $${r.priceMax}`;
  return null;
}

/** Admin: live control over every marketplace carousel — the checked-in
 *  registry + operator overrides + the AI design layer. */
export function AdminCarousels() {
  const { data, isLoading } = useAdminCarousels();
  const update = useUpdateCarousel();
  const create = useCreateCarousel();
  const del = useDeleteCarousel();
  const reset = useResetCarousel();
  const setAi = useSetCarouselAi();
  const regenerate = useRegenerateCarousels();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<AdminCarouselRecipe | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const gameLabels = new Map((data?.games ?? []).map((g) => [g.id, g.label]));
  const modalOpen = creating || editing != null;
  const canSubmit =
    form.title.trim() !== "" &&
    form.subtitle.trim() !== "" &&
    (creating ? /^[a-z0-9][a-z0-9-]{0,47}$/.test(form.id.trim()) : true) &&
    (!form.scoped || form.games.length > 0) &&
    !create.isPending &&
    !update.isPending;

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
  }
  function openEdit(r: AdminCarouselRecipe) {
    setForm(toForm(r));
    setEditing(r);
  }
  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  function submit() {
    if (!canSubmit) return;
    const payload = toPayload(form);
    if (creating) {
      create.mutate(payload, {
        onSuccess: () => {
          closeModal();
          notify.success(`“${payload.title}” added — serving now.`);
        },
        onError: () => notify.error("Couldn't add — the id may already exist."),
      });
    } else if (editing) {
      const { id: _id, ...patch } = payload;
      update.mutate(
        { id: editing.id, input: patch },
        {
          onSuccess: () => {
            closeModal();
            notify.success(`“${payload.title}” updated — serving now.`);
          },
          onError: () => notify.error("Couldn't update — please try again."),
        },
      );
    }
  }

  function toggle(r: AdminCarouselRecipe) {
    update.mutate(
      { id: r.id, input: { enabled: !r.enabled } },
      {
        onSuccess: () =>
          notify.success(`“${r.title}” ${r.enabled ? "hidden from" : "live on"} the storefront.`),
        onError: () => notify.error("Couldn't update — please try again."),
      },
    );
  }

  async function remove(r: AdminCarouselRecipe) {
    const ok = await confirm({
      title: `Delete “${r.title}”?`,
      tone: "danger",
      confirmLabel: "Delete shelf",
      message:
        r.origin === "file" ? (
          <>
            It stops serving immediately. Built-in shelves stay listed here so
            you can <strong>restore</strong> them later.
          </>
        ) : (
          <>
            It stops serving immediately. Custom shelves are removed for good —
            this can't be undone.
          </>
        ),
    });
    if (!ok) return;
    del.mutate(r.id, {
      onSuccess: () => notify.success(`“${r.title}” deleted.`),
      onError: () => notify.error("Couldn't delete — please try again."),
    });
  }

  function restore(r: AdminCarouselRecipe) {
    reset.mutate(r.id, {
      onSuccess: () => notify.success(`“${r.title}” restored to the built-in version.`),
      onError: () => notify.error("Couldn't restore — please try again."),
    });
  }

  async function toggleAi() {
    if (!data) return;
    const turningOn = !data.aiEnabled;
    const ok = await confirm({
      title: turningOn ? "Turn AI shelves ON?" : "Turn AI shelves OFF?",
      tone: turningOn ? "mint" : "danger",
      confirmLabel: turningOn ? "Enable AI designs" : "Pin to curated",
      message: turningOn ? (
        <>
          Games with a fresh AI design serve it again; the model designs new
          shelves daily.
        </>
      ) : (
        <>
          Every game serves <strong>exactly this registry</strong> — no model
          calls, no daily redesigns — until you turn it back on.
        </>
      ),
    });
    if (!ok) return;
    setAi.mutate(turningOn, {
      onSuccess: () =>
        notify.success(turningOn ? "AI shelves are ON." : "AI shelves are OFF — curated registry only."),
      onError: () => notify.error("Couldn't update — please try again."),
    });
  }

  function regen(game: AdminCarouselGame) {
    setRegenerating(game.id);
    regenerate.mutate(game.id, {
      onSuccess: (resp) =>
        notify.success(`Fresh AI design for ${game.label} — ${resp.carousels.length} shelves.`),
      onError: () => notify.error(`Couldn't regenerate ${game.label} — check the AI key / try again.`),
      onSettled: () => setRegenerating(null),
    });
  }

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Carousels</h1>
          <p className={admin.subtitle}>
            Every marketplace shelf, live — toggle, edit, add, or hand the merchandising to the model. Changes serve immediately on web and mobile.
          </p>
        </div>
        <Button onClick={openCreate} leadingIcon={<Plus size={16} />}>
          New shelf
        </Button>
      </div>

      {isLoading || !data ? (
        <div className={admin.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={14} />
          ))}
        </div>
      ) : (
        <>
          {/* ── AI design layer ── */}
          <div className={styles.ai} data-on={data.aiEnabled || undefined}>
            <span className={styles.ai__icon}>
              <Sparkles size={18} />
            </span>
            <div className={styles.ai__text}>
              <span className={styles.ai__title}>
                AI-designed shelves
                <span className={styles.ai__state}>
                  {!data.aiConfigured
                    ? "No model key configured"
                    : data.aiEnabled
                      ? "On — model designs daily"
                      : "Off — curated registry only"}
                </span>
              </span>
              <span className={styles.ai__desc}>
                A model redesigns each game's shelves once a day; the registry below is the always-on fallback. Off = every game serves exactly the registry.
              </span>
            </div>
            <Switch
              checked={data.aiEnabled}
              onCheckedChange={toggleAi}
              disabled={setAi.isPending}
              aria-label="Toggle AI-designed shelves"
            />
          </div>

          {/* ── Per-game serve preview ── */}
          <div className={styles.games}>
            {data.games.map((g) => {
              const aiShelves = data.ai[g.id] ?? [];
              return (
                <div key={g.id} className={styles.game}>
                  <div className={styles.game__head}>
                    <span className={styles.game__label}>{g.label}</span>
                    <span className={styles.badge} data-tone={g.activeSource === "ai" ? "mint" : "neutral"}>
                      {g.activeSource === "ai" ? "AI" : "Curated"}
                    </span>
                  </div>
                  <div className={styles.game__counts}>
                    <span>
                      <strong>{g.curatedCount}</strong> curated
                    </span>
                    <span>
                      <strong>{g.aiCount ?? "—"}</strong> AI today
                    </span>
                    <span>
                      <strong>{g.resolvedRails ?? "—"}</strong> rails live
                    </span>
                  </div>
                  {g.catalogOnly && <span className={styles.game__note}>Catalog-only — no price feed</span>}
                  {aiShelves.length > 0 && (
                    <div className={styles.game__shelves}>
                      {aiShelves.map((c) => (
                        <span key={c.id} className={styles.game__shelf} title={c.subtitle}>
                          {c.title}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!data.aiConfigured || !data.aiEnabled || regenerate.isPending}
                    onClick={() => regen(g)}
                    leadingIcon={<RefreshCw size={14} className={regenerating === g.id ? styles.spin : undefined} />}
                  >
                    {regenerating === g.id ? "Designing…" : "Regenerate AI shelves"}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* ── The registry ── */}
          {data.recipes.length === 0 ? (
            <NoteCard title="No shelves" message="Add a shelf to start merchandising the storefront." />
          ) : (
            <div className={admin.list}>
              {data.recipes.map((r) => {
                const priceBand = priceWindow(r);
                return (
                  <div key={r.id} className={styles.row} data-removed={r.removed || undefined}>
                    <div className={styles.row__main}>
                      <span className={styles.row__title}>
                        {r.title}
                        <span className={styles.badge} data-tone={r.origin === "custom" ? "mint" : "neutral"}>
                          {r.origin === "custom" ? "Custom" : "Built-in"}
                        </span>
                        {r.edited && !r.removed && (
                          <span className={styles.badge} data-tone="amber">
                            Edited
                          </span>
                        )}
                        {r.removed && (
                          <span className={styles.badge} data-tone="down">
                            Deleted
                          </span>
                        )}
                      </span>
                      <span className={styles.row__meta}>
                        <code>{r.id}</code>
                        <span>{r.source}</span>
                        {priceBand && <span>{priceBand}</span>}
                        {r.rarityPattern && <code className={styles.row__pattern}>{r.rarityPattern}</code>}
                        <span>
                          {r.games == null
                            ? "all priced games"
                            : r.games.map((id) => gameLabels.get(id) ?? id).join(", ")}
                        </span>
                      </span>
                      <span className={styles.row__subtitle}>{r.subtitle}</span>
                    </div>
                    <div className={styles.row__actions}>
                      {r.removed ? (
                        <Button size="sm" variant="secondary" onClick={() => restore(r)} disabled={reset.isPending} leadingIcon={<RotateCcw size={14} />}>
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Switch
                            checked={r.enabled}
                            onCheckedChange={() => toggle(r)}
                            disabled={update.isPending}
                            aria-label={`Toggle ${r.title}`}
                          />
                          <IconButton label={`Edit ${r.title}`} onClick={() => openEdit(r)}>
                            <SquarePen size={15} />
                          </IconButton>
                          {r.edited && (
                            <IconButton label={`Restore ${r.title} to built-in`} onClick={() => restore(r)} disabled={reset.isPending}>
                              <RotateCcw size={15} />
                            </IconButton>
                          )}
                          <IconButton label={`Delete ${r.title}`} onClick={() => remove(r)} disabled={del.isPending}>
                            <Trash2 size={15} />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create / edit shelf */}
      <Modal
        open={modalOpen}
        onOpenChange={(o) => !o && closeModal()}
        title={creating ? "New shelf" : `Edit “${editing?.title}”`}
        description="A shelf is a filter recipe — price band and/or rarity — the backend compiles into real cards. {label} in copy becomes the game name."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={create.isPending || update.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {create.isPending || update.isPending ? "Saving…" : creating ? "Add shelf" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          {creating && (
            <TextField
              label="Id (kebab-case, permanent)"
              placeholder="budget-binder"
              value={form.id}
              onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
            />
          )}
          <TextField
            label="Title"
            placeholder="Grails & chase cards"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          />
          <TextField
            label="Subtitle"
            placeholder="The trophy {label} cards serious collectors hunt."
            value={form.subtitle}
            onChange={(e) => setForm((s) => ({ ...s, subtitle: e.target.value }))}
          />
          <div className={styles.form__row}>
            <div className={styles.form__field}>
              <span className={styles.form__label}>Cards from</span>
              <SegmentedControl<Source>
                aria-label="Card source"
                options={[
                  { value: "value", label: "Priced pool" },
                  { value: "trending", label: "Trending" },
                  { value: "catalog", label: "Catalog" },
                ]}
                value={form.source}
                onChange={(source) => setForm((s) => ({ ...s, source }))}
              />
            </div>
            <div className={styles.form__field}>
              <span className={styles.form__label}>Sort</span>
              <SegmentedControl<Sort>
                aria-label="Sort order"
                options={[
                  { value: "price_desc", label: "$ high" },
                  { value: "price_asc", label: "$ low" },
                  { value: "name", label: "Name" },
                ]}
                value={form.sort}
                onChange={(sort) => setForm((s) => ({ ...s, sort }))}
              />
            </div>
          </div>
          <div className={styles.form__row}>
            <TextField
              label="Min price (USD)"
              type="number"
              min={0}
              placeholder="none"
              value={form.priceMin}
              onChange={(e) => setForm((s) => ({ ...s, priceMin: e.target.value }))}
            />
            <TextField
              label="Max price (USD)"
              type="number"
              min={0}
              placeholder="none"
              value={form.priceMax}
              onChange={(e) => setForm((s) => ({ ...s, priceMax: e.target.value }))}
            />
            <TextField
              label="Card limit"
              type="number"
              min={4}
              max={40}
              value={form.limit}
              onChange={(e) => setForm((s) => ({ ...s, limit: e.target.value }))}
            />
          </div>
          <TextField
            label="Rarity pattern (regex, optional)"
            placeholder="secret|rainbow|illustration"
            value={form.rarityPattern}
            onChange={(e) => setForm((s) => ({ ...s, rarityPattern: e.target.value }))}
          />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.scoped}
              onChange={(e) => setForm((s) => ({ ...s, scoped: e.target.checked }))}
            />
            Limit to specific games (otherwise serves every priced game)
          </label>
          {form.scoped && (
            <div className={styles.gamesPick}>
              {(data?.games ?? []).map((g: AdminCarouselGame) => (
                <label key={g.id} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.games.includes(g.id)}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        games: e.target.checked ? [...s.games, g.id] : s.games.filter((id) => id !== g.id),
                      }))
                    }
                  />
                  {g.label}
                </label>
              ))}
            </div>
          )}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Serving (enabled)
          </label>
        </div>
      </Modal>
    </div>
  );
}
