import { type ReactNode } from 'react';

interface HighlightTextProps {
  text: string | number | null | undefined;
  highlight?: string;
  className?: string;
}

export function HighlightText({ text, highlight, className = '' }: HighlightTextProps): ReactNode {
  if (text === null || text === undefined) return null;
  const str = String(text);
  if (!highlight || !highlight.trim()) {
    return <span className={className}>{str}</span>;
  }

  const query = highlight.trim().toLowerCase();
  const lowerStr = str.toLowerCase();
  const index = lowerStr.indexOf(query);

  if (index === -1) {
    return <span className={className}>{str}</span>;
  }

  const before = str.slice(0, index);
  const match = str.slice(index, index + query.length);
  const after = str.slice(index + query.length);

  return (
    <span className={className}>
      {before}
      <mark className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded underline decoration-amber-600 decoration-2">
        {match}
      </mark>
      {after}
    </span>
  );
}
