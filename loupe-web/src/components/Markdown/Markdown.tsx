import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "@/lib/cx";
import styles from "./Markdown.module.scss";

export interface MarkdownProps {
  children: string;
  className?: string;
}

/** Renders Markdown (GitHub-flavored) as themed prose. Links open safely in a
 *  new tab. Used for blog posts and any long-form content authored as Markdown. */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cx(styles.markdown, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a target="_blank" rel="noreferrer noopener" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
