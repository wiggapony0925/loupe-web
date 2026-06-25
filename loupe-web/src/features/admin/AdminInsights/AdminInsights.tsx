import { useState } from "react";
import { Sparkles, CornerDownLeft, Database, AlertTriangle } from "lucide-react";
import { useAdminInsightsStatus, useAskInsights } from "@loupe/core";
import { Button, NoteCard, Skeleton } from "@/components";
import styles from "./AdminInsights.module.scss";
import admin from "../admin.module.scss";

const EXAMPLES = [
  "How many cards are there per game?",
  "Top 5 users by number of graded cards",
  "How many users signed up in the last 30 days?",
  "Which sets have the most cards?",
];

function cell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Admin: "Ask your data" — a natural-language question becomes a read-only SQL
 *  query (via Claude), executed safely and shown with its results. */
export function AdminInsights() {
  const { data: status, isLoading: statusLoading } = useAdminInsightsStatus();
  const ask = useAskInsights();
  const [q, setQ] = useState("");

  const submit = () => {
    const question = q.trim();
    if (question.length >= 3) ask.mutate(question);
  };

  const answer = ask.data;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Ask your data</h1>
          <p className={admin.subtitle}>
            Ask a question in plain English — Claude writes a read-only SQL query and runs it.
          </p>
        </div>
      </div>

      {statusLoading ? (
        <Skeleton height={64} radius={14} />
      ) : !status?.configured ? (
        <NoteCard
          title="Not configured"
          message="Set ANTHROPIC_API_KEY on the backend to enable natural-language queries. Queries are read-only, super-admin only, and audited."
        />
      ) : (
        <>
          <div className={styles.ask}>
            <Sparkles size={18} className={styles.ask__icon} />
            <input
              className={styles.ask__input}
              placeholder="e.g. How many Pokémon cards have a price?"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
            />
            <Button onClick={submit} disabled={ask.isPending || q.trim().length < 3} leadingIcon={<CornerDownLeft size={15} />}>
              {ask.isPending ? "Thinking…" : "Ask"}
            </Button>
          </div>

          <div className={styles.examples}>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className={styles.chip} onClick={() => { setQ(ex); ask.mutate(ex); }}>
                {ex}
              </button>
            ))}
          </div>

          {ask.isPending ? (
            <Skeleton height={200} radius={16} />
          ) : answer ? (
            <div className={styles.result}>
              {answer.error ? (
                <NoteCard title="Couldn't answer that" message={answer.error} />
              ) : (
                <>
                  {answer.sql && (
                    <div className={styles.sql}>
                      <div className={styles.sql__head}>
                        <Database size={13} /> Generated SQL
                      </div>
                      <pre>{answer.sql}</pre>
                    </div>
                  )}
                  {answer.columns.length > 0 ? (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>{answer.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {answer.rows.map((row, i) => (
                            <tr key={i}>
                              {answer.columns.map((c) => <td key={c}>{cell(row[c])}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className={styles.meta}>
                        {answer.rowCount.toLocaleString()} row{answer.rowCount === 1 ? "" : "s"}
                        {answer.truncated && " (capped at 200)"}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.empty}>No rows returned.</p>
                  )}
                </>
              )}
            </div>
          ) : (
            ask.isError && (
              <NoteCard
                title="Request failed"
                message={ask.error?.message || "Super-admin privileges are required."}
              />
            )
          )}

          <p className={styles.footnote}>
            <AlertTriangle size={12} /> Read-only · super-admin only · every query is audited.
          </p>
        </>
      )}
    </div>
  );
}
