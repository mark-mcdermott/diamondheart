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
    </div>
  );
}
