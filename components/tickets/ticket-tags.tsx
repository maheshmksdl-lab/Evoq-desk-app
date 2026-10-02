"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { useUpdateTicket } from "@/hooks/use-ticket";
import { SUGGESTED_TAGS } from "@/lib/mock-data/tickets";
import { tagSchema } from "@/lib/schemas/ticket";
import { fieldClass } from "@/components/shared/desk-ui";

/** Subtle neutral tag chips with inline add (validated) and remove. */
export function TicketTags({ ticketId, tags }: { ticketId: string; tags: string[] }) {
  const update = useUpdateTicket();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const suggestions = SUGGESTED_TAGS.filter((t) => !tags.includes(t) && t.includes(text.trim().toLowerCase())).slice(0, 6);

  const add = (raw: string) => {
    const parsed = tagSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid tag.");
      return;
    }
    if (tags.includes(parsed.data)) {
      setError("This tag is already on the ticket.");
      return;
    }
    update.mutate({ id: ticketId, patch: { addTag: parsed.data } }, { onSuccess: () => toast.success(`Tag "${parsed.data}" added`) });
    setText("");
    setError(null);
  };

  const remove = (tag: string) => update.mutate({ id: ticketId, patch: { removeTag: tag } }, { onSuccess: () => toast.success(`Tag "${tag}" removed`) });

  return (
    <div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
        {tags.map((tag) => (
          <li key={tag} className="inline-flex h-7 items-center gap-0.5 rounded-full bg-desk-10 pr-1 pl-3 text-caption font-medium text-ink">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Remove tag ${tag}`}
              className="inline-flex size-5 items-center justify-center rounded-full text-ink-muted hover:bg-white hover:text-ink"
            >
              <XIcon size={11} aria-hidden />
            </button>
          </li>
        ))}
        {!adding && (
          <li>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-line px-3 text-caption font-medium text-ink-muted hover:border-desk hover:text-desk"
            >
              <PlusIcon size={11} weight="bold" aria-hidden />
              Add tag
            </button>
          </li>
        )}
      </ul>
      {!tags.length && !adding && <p className="mt-2 text-body text-ink-muted">No tags yet.</p>}

      {adding && (
        <div className="mt-2">
          <label htmlFor="tag-input" className="sr-only">
            New tag
          </label>
          <input
            id="tag-input"
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(text);
              } else if (e.key === "Escape") {
                setAdding(false);
                setText("");
                setError(null);
              }
            }}
            onBlur={() => {
              if (!text) setAdding(false);
            }}
            placeholder="Type a tag and press Enter"
            aria-invalid={!!error}
            aria-describedby={error ? "tag-error" : undefined}
            className={fieldClass}
          />
          {error && (
            <p id="tag-error" className="mt-1 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="sr-only">Suggestions:</span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s)}
                  className="inline-flex h-7 items-center rounded-full px-2 text-caption font-medium text-desk hover:bg-desk-tint"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
