/**
 * PortfolioSwitcher — active-portfolio control + manage (create / rename / delete).
 *
 * Selection flows through `useActiveCollection`; CRUD uses the shared
 * `@loupe/core` collection mutations so web and mobile hit the same
 * `/v1/collections` endpoints.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useCollectionsOverview,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  type CollectionSummary,
} from "@loupe/core";
import { useActiveCollection } from "@/providers/ActiveCollectionProvider";
import styles from "./PortfolioSwitcher.module.scss";

function money(usd: number): string {
  return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type PromptMode = "create" | "rename" | "delete";

export function PortfolioSwitcher() {
  const { collectionId, setCollectionId } = useActiveCollection();
  const { data: portfolios } = useCollectionsOverview();
  const createCol = useCreateCollection();
  const updateCol = useUpdateCollection();
  const deleteCol = useDeleteCollection();

  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [prompt, setPrompt] = useState<{
    mode: PromptMode;
    target?: CollectionSummary;
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setManaging(false);
        setPrompt(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (prompt) setPrompt(null);
        else {
          setOpen(false);
          setManaging(false);
        }
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, prompt]);

  const rows: CollectionSummary[] = useMemo(() => portfolios ?? [], [portfolios]);
  const active = rows.find((r) => r.id === collectionId) ?? rows.find((r) => r.isAll);
  const label = active?.name ?? "All";

  const openPrompt = (mode: PromptMode, target?: CollectionSummary) => {
    setError(null);
    setDraft(mode === "rename" ? (target?.name ?? "") : mode === "delete" ? "" : "");
    setPrompt({ mode, target });
  };

  const submitPrompt = async () => {
    if (!prompt) return;
    const name = draft.trim();
    setBusy(true);
    setError(null);
    try {
      if (prompt.mode === "create") {
        if (!name) throw new Error("Enter a name.");
        await createCol.mutateAsync({ name });
      } else if (prompt.mode === "rename" && prompt.target?.id) {
        if (!name) throw new Error("Enter a name.");
        await updateCol.mutateAsync({ id: prompt.target.id, name });
      } else if (prompt.mode === "delete" && prompt.target?.id) {
        if (draft !== "DELETE") throw new Error('Type DELETE to confirm.');
        const id = prompt.target.id;
        await deleteCol.mutateAsync(id);
        if (collectionId === id) setCollectionId(null);
      }
      setPrompt(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.pill}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Portfolio ${label}. Change portfolio.`}
        onClick={() => setOpen((v) => !v)}
      >
        <Layers size={14} className={styles.icon} aria-hidden />
        <span className={styles.name}>{label}</span>
        <ChevronDown size={13} className={styles.chev} />
      </button>

      {open && (
        <div className={styles.menu} role="listbox" aria-label="Portfolio">
          <div className={styles.menuHead}>
            <span className={styles.menuTitle}>
              {managing ? "Manage portfolios" : "Choose a portfolio"}
            </span>
            <button
              type="button"
              className={styles.manageBtn}
              onClick={() => setManaging((v) => !v)}
            >
              {managing ? "Done" : "Manage"}
            </button>
          </div>

          {rows.map((p) => {
            const isActive = (p.id ?? null) === (collectionId ?? null);
            return (
              <div
                key={p.id ?? "all"}
                className={isActive ? `${styles.row} ${styles.rowActive}` : styles.row}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={styles.rowMain}
                  onClick={() => {
                    if (managing) return;
                    setCollectionId(p.id);
                    setOpen(false);
                    setManaging(false);
                  }}
                >
                  <span
                    className={styles.dot}
                    style={p.color ? { background: p.color } : undefined}
                    aria-hidden
                  />
                  <span className={styles.rowName}>{p.name}</span>
                  <span className={styles.rowMeta}>
                    {p.cardCount} · {money(p.totalValueUsd)}
                  </span>
                  {!managing && isActive && (
                    <Check size={14} className={styles.check} />
                  )}
                </button>
                {managing && p.id ? (
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`Rename ${p.name}`}
                      onClick={() => openPrompt("rename", p)}
                    >
                      <Pencil size={14} />
                    </button>
                    {p.deletable ? (
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        aria-label={`Delete ${p.name}`}
                        onClick={() => openPrompt("delete", p)}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          <button
            type="button"
            className={styles.createRow}
            onClick={() => openPrompt("create")}
          >
            <Plus size={14} />
            New collection
          </button>

          {prompt ? (
            <div className={styles.prompt}>
              <p className={styles.promptTitle}>
                {prompt.mode === "create"
                  ? "New collection"
                  : prompt.mode === "rename"
                    ? `Rename “${prompt.target?.name}”`
                    : `Delete “${prompt.target?.name}”?`}
              </p>
              <p className={styles.promptHint}>
                {prompt.mode === "delete"
                  ? "Holdings stay in All. Type DELETE to confirm."
                  : "Name your portfolio — you can rename it later."}
              </p>
              <input
                className={styles.promptInput}
                autoFocus
                value={draft}
                placeholder={prompt.mode === "delete" ? "DELETE" : "Collection name"}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitPrompt();
                }}
              />
              {error ? <p className={styles.promptError}>{error}</p> : null}
              <div className={styles.promptActions}>
                <button
                  type="button"
                  className={styles.promptCancel}
                  onClick={() => setPrompt(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={
                    prompt.mode === "delete"
                      ? `${styles.promptSubmit} ${styles.promptSubmitDanger}`
                      : styles.promptSubmit
                  }
                  onClick={() => void submitPrompt()}
                  disabled={busy}
                >
                  {busy
                    ? "…"
                    : prompt.mode === "create"
                      ? "Create"
                      : prompt.mode === "rename"
                        ? "Save"
                        : "Delete"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
