"use client";

import type { Icon } from "@phosphor-icons/react";
import { DownloadSimpleIcon, FileCsvIcon, FileIcon, FileImageIcon, FilePdfIcon, FileTextIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/format";
import type { Attachment } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

function fileVisual(mimeType: string, name: string): { icon: Icon; label: string; tone: string } {
  const ext = name.split(".").pop()?.toUpperCase() ?? "FILE";
  if (mimeType.startsWith("image/")) return { icon: FileImageIcon, label: ext, tone: "text-sky-700 bg-sky-50" };
  if (mimeType === "application/pdf") return { icon: FilePdfIcon, label: "PDF", tone: "text-red-700 bg-red-50" };
  if (mimeType === "text/csv") return { icon: FileCsvIcon, label: "CSV", tone: "text-emerald-700 bg-emerald-50" };
  if (mimeType.startsWith("text/")) return { icon: FileTextIcon, label: ext, tone: "text-slate-700 bg-slate-100" };
  return { icon: FileIcon, label: ext, tone: "text-slate-700 bg-slate-100" };
}

type AttachmentLike = Pick<Attachment, "name" | "size" | "mimeType"> & { id?: string };

/** File chips: type, name, size and a download (or remove, for drafts) action. */
export function AttachmentList({
  attachments,
  onRemove,
  className,
}: {
  attachments: AttachmentLike[];
  onRemove?: (index: number) => void;
  className?: string;
}) {
  if (!attachments.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Attachments">
      {attachments.map((a, i) => {
        const { icon: IconCmp, label, tone } = fileVisual(a.mimeType, a.name);
        return (
          <li key={a.id ?? `${a.name}-${i}`} className="flex max-w-full min-w-0 items-center gap-3 rounded-xl border border-line-soft bg-white py-2 pr-2 pl-2.5 sm:max-w-[300px]">
            <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>
              <IconCmp size={18} weight="duotone" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium text-ink" title={a.name}>
                {a.name}
              </span>
              <span className="text-xs text-ink-muted">
                {label} · {formatFileSize(a.size)}
              </span>
            </span>
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${a.name}`}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-desk-tint hover:text-ink"
              >
                <XIcon size={14} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.info("Sample file", { description: `${a.name} is sample data and can't be downloaded in this preview.` })}
                aria-label={`Download ${a.name}`}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-desk-tint hover:text-ink"
              >
                <DownloadSimpleIcon size={16} aria-hidden />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
