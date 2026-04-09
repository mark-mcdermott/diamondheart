"use client";

import { cn } from "@/lib/utils";

interface ProseProps {
  html?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Prose({ html, children, className }: ProseProps) {
  return (
    <div className={cn("prose-content", className)}>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        children
      )}
      <style jsx>{`
        .prose-content :global(h2) {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          color: var(--app-foreground);
        }
        .prose-content :global(h3) {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: var(--app-foreground);
        }
        .prose-content :global(p) {
          margin-bottom: 1.25rem;
          line-height: 1.8;
          color: var(--app-muted-foreground);
        }
        .prose-content :global(strong) {
          color: var(--app-foreground);
        }
        .prose-content :global(ul),
        .prose-content :global(ol) {
          margin-bottom: 1.25rem;
          padding-left: 1.5rem;
          color: var(--app-muted-foreground);
        }
        .prose-content :global(li) {
          margin-bottom: 0.5rem;
          line-height: 1.7;
        }
        .prose-content :global(code) {
          background: var(--app-muted);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        .prose-content :global(pre) {
          background: var(--app-foreground);
          color: var(--app-background);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1.25rem;
        }
        .prose-content :global(pre code) {
          background: transparent;
          padding: 0;
        }
        .prose-content :global(blockquote) {
          border-left: 3px solid var(--app-border);
          padding-left: 1.25rem;
          font-style: italic;
          color: var(--app-muted-foreground);
        }
        .prose-content :global(a) {
          color: var(--app-foreground);
          text-decoration: underline;
        }
        .prose-content :global(a:hover) {
          color: var(--app-muted-foreground);
        }
        .prose-content :global(img) {
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        .prose-content :global(hr) {
          border: none;
          border-top: 1px solid var(--app-border);
          margin: 2rem 0;
        }
        .prose-content :global(table) {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        .prose-content :global(th),
        .prose-content :global(td) {
          border: 1px solid var(--app-border);
          padding: 0.5rem 0.75rem;
        }
        .prose-content :global(th) {
          background: var(--app-muted);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
