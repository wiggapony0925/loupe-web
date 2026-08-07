import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  useAdminLegal,
  useAdminLegalUnresolved,
  usePublishLegalDocument,
  useResetAllLegal,
  useResetLegalDocument,
  useRetireLegalDocument,
  useSetLegalEntity,
  type AdminLegalDocument,
  type LegalDocument,
  type LegalSection,
} from "@loupe/core";
import {
  Badge,
  Button,
  IconButton,
  Markdown,
  NoteCard,
  SegmentedControl,
  Skeleton,
  TextField,
  useConfirm,
} from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminLegal.module.scss";
import admin from "../admin.module.scss";

/** Today, as the ISO date the editor stamps on a publish. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A kebab-case section id derived from a heading ("3. Fair use" → "fair-use"). */
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/^[\d.\s]+/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "section"
  );
}

/** Strip the portal annotations so what we send back is a clean document. */
function toDraft(doc: AdminLegalDocument): LegalDocument {
  return {
    slug: doc.slug,
    title: doc.title,
    lead: doc.lead,
    effective: doc.effective,
    updated: doc.updated,
    summary: [...doc.summary],
    sections: doc.sections.map((s) => ({ ...s })),
  };
}

/** Render a document the way a reader sees it, resolving `{{placeholders}}`
 *  against the live entity block — the same rule the backend applies. */
function interpolate(text: string, entity: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => entity[key] ?? match);
}

function draftMarkdown(doc: LegalDocument, entity: Record<string, string>): string {
  const parts = [`# ${doc.title}`];
  if (doc.lead) parts.push(`_${doc.lead}_`);
  parts.push(`**Last updated:** ${doc.updated}  \n**Effective:** ${doc.effective}`);
  if (doc.summary.length) {
    parts.push("## In short");
    parts.push(doc.summary.map((line) => `- ${line}`).join("\n"));
  }
  for (const section of doc.sections) {
    parts.push(`## ${section.heading}`);
    parts.push(section.body);
  }
  return interpolate(parts.join("\n\n"), entity);
}

// ──────────────────────────────────────────────────────────────────────────
// Entity editor
// ──────────────────────────────────────────────────────────────────────────

function EntityEditor({
  entity,
  fileEntity,
}: {
  entity: Record<string, string>;
  fileEntity: Record<string, string>;
}) {
  const save = useSetLegalEntity();
  const [draft, setDraft] = useState(entity);
  const [newKey, setNewKey] = useState("");

  useEffect(() => setDraft(entity), [entity]);

  // File keys first, in file order, then any operator-added ones.
  const keys = useMemo(() => {
    const fromFile = Object.keys(fileEntity);
    const extra = Object.keys(draft).filter((k) => !(k in fileEntity));
    return [...fromFile, ...extra.sort()];
  }, [draft, fileEntity]);

  const dirty = useMemo(
    () =>
      keys.some((k) => (draft[k] ?? "") !== (entity[k] ?? "")) ||
      Object.keys(draft).length !== Object.keys(entity).length,
    [draft, entity, keys],
  );

  function addKey() {
    const key = newKey.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
      notify.error("A placeholder key must be a plain identifier, e.g. dpoEmail.");
      return;
    }
    if (key in draft) {
      notify.error(`${key} already exists.`);
      return;
    }
    setDraft({ ...draft, [key]: "" });
    setNewKey("");
  }

  return (
    <div className={styles.entity}>
      <NoteCard
        variant="info"
        title="One place, every document"
        message="These values fill every {{placeholder}} in the corpus. Change the company name here and it changes in all six documents at once — the contracts never repeat it."
      />

      <div className={styles.entity__grid}>
        {keys.map((key) => {
          const value = draft[key] ?? "";
          const fileValue = fileEntity[key];
          const overridden = fileValue !== undefined && fileValue !== value;
          return (
            <div key={key} className={styles.entity__row}>
              <div className={styles.entity__key}>
                <code>{`{{${key}}}`}</code>
                {overridden && <Badge tone="amber">edited</Badge>}
                {fileValue === undefined && <Badge tone="blue">custom</Badge>}
              </div>
              <TextField
                label={key}
                value={value}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
              {overridden && (
                <button
                  type="button"
                  className={styles.entity__revert}
                  onClick={() => setDraft({ ...draft, [key]: fileValue })}
                >
                  Revert to “{fileValue}”
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.entity__add}>
        <TextField
          label="New placeholder key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="newPlaceholderKey"
        />
        <Button variant="ghost" onClick={addKey} disabled={!newKey.trim()}>
          <Plus size={16} /> Add placeholder
        </Button>
      </div>

      <div className={styles.stickyBar}>
        <Button
          onClick={() =>
            save.mutate(draft, {
              onSuccess: () => notify.success("Entity block published."),
              onError: () => notify.error("Couldn't save — please try again."),
            })
          }
          disabled={!dirty || save.isPending}
        >
          <Save size={16} /> {save.isPending ? "Publishing…" : "Publish entity"}
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft(entity)}>
            Discard changes
          </Button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Document editor
// ──────────────────────────────────────────────────────────────────────────

function DocumentEditor({
  doc,
  entity,
  onBack,
}: {
  doc: AdminLegalDocument;
  entity: Record<string, string>;
  onBack: () => void;
}) {
  const publish = usePublishLegalDocument();
  const reset = useResetLegalDocument();
  const confirm = useConfirm();

  const [draft, setDraft] = useState<LegalDocument>(() => toDraft(doc));
  const [preview, setPreview] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => setDraft(toDraft(doc)), [doc]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(toDraft(doc)),
    [draft, doc],
  );

  function patch(next: Partial<LegalDocument>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  function patchSection(index: number, next: Partial<LegalSection>) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, i) => (i === index ? { ...s, ...next } : s)),
    }));
  }

  function moveSection(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= draft.sections.length) return;
    const sections = [...draft.sections];
    const [moved] = sections.splice(index, 1);
    if (!moved) return;
    sections.splice(target, 0, moved);
    patch({ sections });
  }

  async function removeSection(index: number) {
    const section = draft.sections[index];
    if (!section) return;
    const ok = await confirm({
      title: `Delete “${section.heading}”?`,
      message:
        "The clause is removed from the draft. Nothing is published until you press Publish.",
      confirmLabel: "Delete clause",
      tone: "danger",
    });
    if (!ok) return;
    patch({ sections: draft.sections.filter((_, i) => i !== index) });
  }

  function addSection() {
    const id = `section-${draft.sections.length + 1}`;
    patch({
      sections: [
        ...draft.sections,
        { id, heading: `${draft.sections.length + 1}. New clause`, body: "" },
      ],
    });
    setOpenSection(id);
  }

  function doPublish() {
    // Ids are anchor targets and must stay unique and URL-safe, whatever the
    // operator typed into the heading.
    const seen = new Set<string>();
    const sections = draft.sections.map((s) => {
      let id = s.id.trim() ? slugify(s.id) : slugify(s.heading);
      let n = 2;
      while (seen.has(id)) id = `${slugify(s.heading)}-${n++}`;
      seen.add(id);
      return { ...s, id };
    });

    if (sections.some((s) => !s.heading.trim() || !s.body.trim())) {
      notify.error("Every clause needs a heading and a body.");
      return;
    }

    publish.mutate(
      { ...draft, sections, updated: today() },
      {
        onSuccess: () => notify.success(`${draft.title} is live.`),
        onError: () => notify.error("Couldn't publish — please try again."),
      },
    );
  }

  async function doReset() {
    const ok = await confirm({
      title: `Restore “${doc.title}” to the checked-in version?`,
      message:
        "Every portal edit to this document is discarded and the deployed text takes over immediately.",
      confirmLabel: "Restore",
      tone: "danger",
    });
    if (!ok) return;
    reset.mutate(doc.slug, {
      onSuccess: () => notify.success("Restored to the checked-in version."),
      onError: () => notify.error("Couldn't restore — please try again."),
    });
  }

  return (
    <div className={styles.editor}>
      <div className={admin.head}>
        <div>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} /> All documents
          </Button>
          <h2 className={admin.title}>{draft.title}</h2>
          <p className={admin.subtitle}>
            <code>/legal/{draft.slug}</code> · {draft.sections.length} clauses
            {doc.edited && " · edited from the portal"}
          </p>
        </div>
        <div className={admin.toolbar}>
          <Button variant="ghost" onClick={() => setPreview((p) => !p)}>
            <Eye size={16} /> {preview ? "Edit" : "Preview"}
          </Button>
          <a
            href={`/legal/${draft.slug}`}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.liveLink}
          >
            <ExternalLink size={14} /> Live page
          </a>
          {doc.origin === "file" && doc.edited && (
            <Button variant="ghost" onClick={doReset}>
              <Undo2 size={16} /> Restore checked-in
            </Button>
          )}
        </div>
      </div>

      {preview ? (
        <div className={styles.preview}>
          <Markdown internalLinks>{draftMarkdown(draft, entity)}</Markdown>
        </div>
      ) : (
        <>
          <div className={admin.formRow}>
            <TextField
              label="Title"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
            <TextField
              label="Effective date"
              value={draft.effective}
              onChange={(e) => patch({ effective: e.target.value })}
              placeholder="2026-08-07"
            />
          </div>

          <div className={admin.field}>
            <label className={admin.label} htmlFor="legal-lead">
              Lead — the one-line description under the title
            </label>
            <textarea
              id="legal-lead"
              className={admin.textarea}
              rows={2}
              value={draft.lead}
              onChange={(e) => patch({ lead: e.target.value })}
            />
          </div>

          <div className={admin.field}>
            <label className={admin.label}>“In short” bullets</label>
            <p className={styles.hint}>
              Plain-English orientation shown above the legal text. Keep them honest —
              they are the first thing anyone reads.
            </p>
            {draft.summary.map((line, i) => (
              <div key={i} className={styles.summaryRow}>
                <textarea
                  className={admin.textarea}
                  rows={2}
                  value={line}
                  onChange={(e) =>
                    patch({
                      summary: draft.summary.map((s, j) => (j === i ? e.target.value : s)),
                    })
                  }
                />
                <IconButton
                  label="Remove bullet"
                  onClick={() =>
                    patch({ summary: draft.summary.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={() => patch({ summary: [...draft.summary, ""] })}
            >
              <Plus size={16} /> Add bullet
            </Button>
          </div>

          <div className={styles.sections}>
            <h3 className={admin.label}>Clauses</h3>
            {draft.sections.map((section, i) => {
              const open = openSection === section.id;
              return (
                <div key={`${section.id}-${i}`} className={styles.section}>
                  <div className={styles.section__head}>
                    <button
                      type="button"
                      className={styles.section__toggle}
                      onClick={() => setOpenSection(open ? null : section.id)}
                      aria-expanded={open}
                    >
                      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>{section.heading || "Untitled clause"}</span>
                    </button>
                    <div className={styles.section__actions}>
                      <IconButton
                        label="Move up"
                        onClick={() => moveSection(i, -1)}
                        disabled={i === 0}
                      >
                        <ChevronUp size={16} />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        onClick={() => moveSection(i, 1)}
                        disabled={i === draft.sections.length - 1}
                      >
                        <ChevronDown size={16} />
                      </IconButton>
                      <IconButton label="Delete clause" onClick={() => removeSection(i)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </div>

                  {open && (
                    <div className={styles.section__body}>
                      <TextField
                        label="Clause heading"
                        value={section.heading}
                        onChange={(e) => patchSection(i, { heading: e.target.value })}
                      />
                      <textarea
                        className={admin.textarea}
                        rows={16}
                        value={section.body}
                        onChange={(e) => patchSection(i, { body: e.target.value })}
                        aria-label="Clause body (Markdown)"
                        spellCheck
                      />
                      <p className={styles.hint}>
                        Markdown, GitHub-flavoured — tables and links work.{" "}
                        <code>{"{{legalName}}"}</code> and friends resolve from the Entity
                        tab.
                      </p>
                      <div className={styles.section__preview}>
                        <Markdown internalLinks>
                          {interpolate(section.body || "_Empty._", entity)}
                        </Markdown>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <Button variant="ghost" onClick={addSection}>
              <Plus size={16} /> Add clause
            </Button>
          </div>
        </>
      )}

      <div className={styles.stickyBar}>
        <Button onClick={doPublish} disabled={!dirty || publish.isPending}>
          <Save size={16} /> {publish.isPending ? "Publishing…" : "Publish"}
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft(toDraft(doc))}>
            Discard changes
          </Button>
        )}
        <span className={styles.stickyBar__note}>
          {dirty
            ? "Unpublished changes — readers still see the live version."
            : "Live. Publishing stamps today’s date as “last updated”."}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────

/** Admin: Law — edit and publish the Terms, Privacy Policy, and the rest of
 *  the legal corpus. The checked-in JSON is the default; portal edits are
 *  stored as an override and served immediately, with no deploy. */
export function AdminLegal() {
  const { data, isLoading } = useAdminLegal();
  const { data: unresolved } = useAdminLegalUnresolved();
  const retire = useRetireLegalDocument();
  const resetAll = useResetAllLegal();
  const confirm = useConfirm();

  const [tab, setTab] = useState<"documents" | "entity">("documents");
  const [editing, setEditing] = useState<string | null>(null);

  const selected = data?.documents.find((d) => d.slug === editing) ?? null;

  async function doRetire(doc: AdminLegalDocument) {
    const ok = await confirm({
      title: `Take “${doc.title}” down?`,
      message:
        doc.origin === "file"
          ? "It stops being served immediately. It stays listed here so you can restore it."
          : "This document was created here and will be deleted permanently.",
      confirmLabel: "Take down",
      tone: "danger",
    });
    if (!ok) return;
    retire.mutate(doc.slug, {
      onSuccess: () => notify.success(`${doc.title} taken down.`),
      onError: () => notify.error("Couldn't take it down — please try again."),
    });
  }

  async function doResetAll() {
    const ok = await confirm({
      title: "Discard every portal edit?",
      message:
        "All documents and the entity block revert to the checked-in versions. This cannot be undone.",
      confirmLabel: "Discard everything",
      tone: "danger",
    });
    if (!ok) return;
    resetAll.mutate(undefined, {
      onSuccess: () => notify.success("Reverted to the checked-in corpus."),
      onError: () => notify.error("Couldn't revert — please try again."),
    });
  }

  if (isLoading || !data) {
    return (
      <div className={admin.page}>
        <Skeleton height={320} radius={14} />
      </div>
    );
  }

  if (selected) {
    return (
      <div className={admin.page}>
        <DocumentEditor
          doc={selected}
          entity={data.entity}
          onBack={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Law</h1>
          <p className={admin.subtitle}>
            The published Terms, Privacy Policy, and the rest. Edits go live immediately —
            no deploy.
            {data.updatedBy && ` Last edited by ${data.updatedBy}.`}
          </p>
        </div>
        <div className={admin.toolbar}>
          {data.dirty && (
            <Button variant="ghost" onClick={doResetAll}>
              <RotateCcw size={16} /> Revert everything
            </Button>
          )}
        </div>
      </div>

      {!!unresolved?.length && (
        <NoteCard
          variant="warning"
          icon={<AlertTriangle size={16} />}
          title="Readers are seeing raw placeholders"
          message={`These appear in the copy but have no value in the Entity tab: ${unresolved
            .map((t) => `{{${t}}}`)
            .join(", ")}`}
        />
      )}

      <SegmentedControl
        aria-label="Legal corpus section"
        value={tab}
        onChange={setTab}
        options={[
          { value: "documents", label: "Documents" },
          { value: "entity", label: "Entity & contacts" },
        ]}
      />

      {tab === "entity" ? (
        <EntityEditor entity={data.entity} fileEntity={data.fileEntity} />
      ) : (
        <div className={admin.list}>
          {data.documents.map((doc) => (
            <div key={doc.slug} className={admin.row}>
              <div className={admin.row__main}>
                <p className={admin.row__title}>
                  {doc.title}
                  {doc.removed && <Badge tone="rose">taken down</Badge>}
                  {doc.edited && !doc.removed && <Badge tone="amber">edited</Badge>}
                  {doc.origin === "custom" && <Badge tone="blue">custom</Badge>}
                </p>
                <p className={admin.row__meta}>
                  /legal/{doc.slug} · {doc.sections.length} clauses · updated {doc.updated}
                </p>
              </div>
              <div className={admin.row__actions}>
                <Button variant="ghost" onClick={() => setEditing(doc.slug)}>
                  Edit
                </Button>
                {!doc.removed && (
                  <IconButton label="Take down" onClick={() => doRetire(doc)}>
                    <Trash2 size={16} />
                  </IconButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
