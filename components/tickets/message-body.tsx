import { Fragment, type ReactNode } from "react";
import Link from "next/link";

/**
 * Renders the composer's lightweight formatting — **bold**, _italic_,
 * `code`, [links](https://…), "- " bullets and paragraphs — as React
 * elements. No HTML is ever injected.
 */
const INLINE = /(\*\*[^*]+\*\*|(?<!\w)_[^_\n]+_(?!\w)|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|#DK-\d{4}-\d{5})/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key} className="rounded bg-muted px-1 py-px font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    }
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (link) {
      return (
        <a key={key} href={link[2]} target="_blank" rel="noreferrer noopener" className="font-medium text-desk underline underline-offset-2">
          {link[1]}
        </a>
      );
    }
    if (/^#DK-\d{4}-\d{5}$/.test(part)) {
      return (
        <Link key={key} href={`/tickets/${part.slice(1)}`} className="font-medium text-desk hover:underline">
          {part}
        </Link>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function MessageBody({ body }: { body: string }) {
  const blocks = body.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2.5 text-body leading-[1.6] break-words text-ink">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l))) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*[-*] /, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
