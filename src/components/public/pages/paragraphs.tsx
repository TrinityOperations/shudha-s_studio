/** Plain settings text as paragraphs: a blank line starts a new one. */
export function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, i) => (
        <p key={i} className="text-ink max-w-prose whitespace-pre-line">
          {block}
        </p>
      ))}
    </div>
  );
}
