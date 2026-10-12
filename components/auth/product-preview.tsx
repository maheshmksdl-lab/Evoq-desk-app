"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  BookOpenIcon,
  CaretDownIcon,
  ChartLineUpIcon,
  ChatCircleDotsIcon,
  CircleIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  DotsThreeIcon,
  FileImageIcon,
  GearSixIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PaperclipIcon,
  RobotIcon,
  SlidersHorizontalIcon,
  SmileyIcon,
  SparkleIcon,
  TicketIcon,
  TrayIcon,
  UserCircleDashedIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * A picture of the Inbox for the sign-in page: a static, decorative mock
 * (hidden from assistive tech) built from the same sample customers and
 * tickets the app ships with. Drawn at 1100px and scaled to the panel.
 */
const W = 1100;

const QUEUES = [
  { label: "All open", count: 52, icon: CircleIcon, active: true },
  { label: "New", count: 16, icon: SparkleIcon },
  { label: "My tickets", count: 12, icon: UserIcon },
  { label: "Unassigned", count: 6, icon: UserCircleDashedIcon },
  { label: "SLA at risk", count: 4, icon: ClockIcon },
  { label: "Waiting for customer", count: 18, icon: ChatCircleDotsIcon },
  { label: "Recently updated", icon: ClockCounterClockwiseIcon },
];
const TEAMS = [
  { label: "Technical Support", count: 18 },
  { label: "Billing Support", count: 9 },
  { label: "Customer Success", count: 7 },
  { label: "Product Support", count: 5 },
];
const MODULES = [
  { label: "Tickets", icon: TicketIcon },
  { label: "Customers", icon: UsersThreeIcon },
  { label: "Knowledge", icon: BookOpenIcon },
  { label: "Reports", icon: ChartLineUpIcon },
  { label: "Automations", icon: RobotIcon },
  { label: "Settings", icon: GearSixIcon },
];

type Priority = "High" | "Medium" | "Low";
const PRIORITY: Record<Priority, string> = { High: "bg-[#FEF2F2] text-[#EF4444]", Medium: "bg-[#FFF7ED] text-[#EA580C]", Low: "bg-desk-tint text-desk" };

const ROWS: { subject: string; preview: string; avatar?: string; initials?: string; due: string; urgent?: boolean; priority: Priority; active?: boolean }[] = [
  { subject: "Payment failed for order #4821", preview: "The payment went through but I'm still seeing an error on my order...", avatar: "/avatars/con-marcus.jpg", due: "18m left", urgent: true, priority: "High", active: true },
  { subject: "Unable to reset password", preview: "I've tried the reset link multiple times but not receiving the email.", initials: "PR", due: "42m left", urgent: true, priority: "High" },
  { subject: "Invoice not received", preview: "I haven't received my invoice for the last month. Can you please check?", avatar: "/avatars/con-jwilson.jpg", due: "2h left", priority: "Medium" },
  { subject: "Update shipping address", preview: "Can you please update my shipping address to 123 Main St, San Francisco?", avatar: "/avatars/con-tom.jpg", due: "3h left", priority: "Medium" },
  { subject: "Feature request: bulk export", preview: "It would be great to have a bulk export option for reports.", avatar: "/avatars/con-grace.jpg", due: "1d left", priority: "Low" },
  { subject: "Error when generating report", preview: "I'm getting an error when I try to export the customer report as CSV.", avatar: "/avatars/con-aaron.jpg", due: "5h ago", priority: "Medium" },
];

function Avatar({ src, initials, size = 36 }: { src?: string; initials?: string; size?: number }) {
  return src ? (
    <Image src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-desk-10 text-[13px] font-bold text-ink" style={{ width: size, height: size }}>
      {initials}
    </span>
  );
}

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.68);

  // Fit the drawing to the panel: a little wider than the panel, so it runs off the right edge like a screenshot.
  useEffect(() => {
    const panel = ref.current?.parentElement;
    if (!panel) return;
    const ro = new ResizeObserver(([e]) => setScale((e.contentRect.width * 0.98) / W));
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none relative mt-10 ml-[18%] select-none xl:mt-12" style={{ height: 720 * scale }}>
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: W, transform: `scale(${scale}) perspective(2400px) rotateX(7deg) rotateY(-9deg) rotateZ(-3.5deg)` }}
      >
        <div className="flex h-[720px] overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_40px_80px_rgb(16_24_40/0.14),0_10px_24px_rgb(16_24_40/0.06)] ring-8 ring-white/60">
          {/* Sidebar */}
          <div className="w-[230px] shrink-0 border-r border-line-soft bg-sidebar px-4 py-5">
            <div className="mb-6 flex items-center gap-2.5 px-1">
              <span className="relative size-9 shrink-0 overflow-hidden rounded-[10px]">
                <Image src="/media/evoq-desk-logo-1.png" alt="" width={135} height={55} className="absolute top-0 left-0 h-full w-auto max-w-none" />
              </span>
              <span className="text-[18px] font-bold text-ink">EVOQ Desk</span>
            </div>
            <Row icon={HouseIcon} label="Overview" />
            <div className="-mx-4 mt-1 flex h-10 items-center gap-3 border-l-[3px] border-desk bg-desk-10 pr-3 pl-[13px] text-[14px] font-semibold text-ink">
              <TrayIcon size={18} weight="fill" className="text-desk" /> Inbox <CaretDownIcon size={12} className="ml-auto text-ink-muted" />
            </div>
            <div className="mt-1 space-y-0.5">
              {QUEUES.map((q) => (
                <div key={q.label} className={cn("flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px]", q.active ? "bg-desk-10 font-medium text-desk" : "text-ink-body")}>
                  <q.icon size={14} className={q.active ? "text-desk" : "text-ink-faint"} />
                  <span className="flex-1 truncate">{q.label}</span>
                  {q.count !== undefined && <span className={cn("text-[11.5px]", q.active ? "font-semibold" : "text-ink-muted")}>{q.count}</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-line-soft pt-3">
              <Row icon={UsersThreeIcon} label="Teams" bold />
              {TEAMS.map((t) => (
                <div key={t.label} className="flex h-8 items-center gap-2.5 pr-2.5 pl-5 text-[12.5px] text-ink-body">
                  <CircleIcon size={9} className="text-ink-faint" />
                  <span className="flex-1 truncate">{t.label}</span>
                  <span className="text-[11.5px] text-ink-muted">{t.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-line-soft pt-3">
              {MODULES.map((m) => (
                <Row key={m.label} icon={m.icon} label={m.label} />
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="w-[400px] shrink-0 border-r border-line-soft">
            <div className="px-5 pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[21px] font-bold text-ink">All open</p>
                  <p className="text-[12.5px] text-ink-muted">52 conversations</p>
                </div>
                <span className="flex size-8 items-center justify-center rounded-lg border border-line text-ink-body">
                  <NotePencilIcon size={15} />
                </span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {["Views", "Status", "Priority", "Team"].map((f, i) => (
                  <span key={f} className={cn("flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[11.5px] font-medium", i === 0 ? "border-desk/30 bg-desk-tint text-desk" : "border-line text-ink-body")}>
                    {f} <CaretDownIcon size={9} />
                  </span>
                ))}
                <span className="ml-auto flex size-7 items-center justify-center rounded-lg border border-line text-ink-body">
                  <SlidersHorizontalIcon size={13} />
                </span>
              </div>
              <div className="mt-2.5 flex h-8 items-center gap-2 rounded-lg bg-[#F4F6F8] px-3 text-[12px] text-ink-muted">
                <MagnifyingGlassIcon size={13} /> Search conversations...
              </div>
            </div>
            <div className="mt-3 border-t border-line-soft">
              {ROWS.map((r) => (
                <div key={r.subject} className={cn("relative flex gap-3 border-b border-line-soft px-5 py-3.5", r.active && "bg-desk-tint before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-desk")}>
                  <Avatar src={r.avatar} initials={r.initials} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="flex-1 truncate text-[13.5px] font-semibold text-ink">{r.subject}</p>
                      <span className={cn("shrink-0 text-[11px] font-medium", r.urgent ? "text-[#EF4444]" : "text-[#D97706]")}>{r.due}</span>
                    </div>
                    <div className="mt-0.5 flex items-end gap-2">
                      <p className="line-clamp-2 flex-1 text-[12px] leading-[17px] text-ink-muted">{r.preview}</p>
                      <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-medium", PRIORITY[r.priority])}>{r.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket workspace */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-line-soft px-5 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink-body">#DK-2026-00483</span>
                <span className="rounded-md bg-[#FEF2F2] px-2 py-0.5 text-[10.5px] font-medium text-[#EF4444]">High</span>
              </div>
              <p className="mt-1 text-[19px] font-bold text-ink">Payment failed for order #4821</p>
              <p className="text-[11.5px] text-ink-muted">Created 2 hours ago via Email</p>
            </div>
            <div className="flex-1 space-y-4 overflow-hidden bg-[#FBFCFD] px-5 py-4">
              <Message avatar="/avatars/con-marcus.jpg" name="Marcus Lee" time="10:24 AM" body="Hi, the payment went through but I'm still seeing an error on my order. Can you please check and confirm?" />
              <div className="ml-12 flex w-[190px] items-center gap-2.5 rounded-xl border border-line bg-white p-2.5">
                <FileImageIcon size={26} className="text-ink-faint" />
                <span>
                  <span className="block text-[11.5px] font-semibold text-ink">payment-error.png</span>
                  <span className="block text-[10.5px] text-ink-muted">320 KB</span>
                </span>
              </div>
              <div className="ml-auto w-[78%] rounded-2xl rounded-tr-sm bg-desk-tint px-3.5 py-2.5 text-[12px] leading-[18px] text-ink-body">
                Hi Marcus, thanks for the details. I&apos;m checking the payment with our gateway now.
              </div>
              <Message avatar="/avatars/con-marcus.jpg" name="Marcus Lee" time="10:32 AM" body="Thank you. Order number is #4821. Please confirm if the payment was successful." />
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-desk-10 text-[10px] font-bold text-ink">AM</span>
                  <span className="text-[12px] font-semibold text-ink">Alex Morgan</span>
                  <span className="text-[10.5px] text-ink-muted">10:34 AM · Internal note</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-[18px] text-ink-body">
                  <span className="font-medium text-desk">@Sarah Wilson</span> can you check the gateway logs? Customer says payment was successful.
                </p>
              </div>
            </div>
            <div className="border-t border-line-soft px-5 py-3">
              <div className="flex gap-4 text-[12px]">
                <span className="border-b-2 border-desk pb-1.5 font-semibold text-desk">Reply</span>
                <span className="pb-1.5 text-ink-muted">Internal note</span>
              </div>
              <p className="mt-2.5 text-[12px] text-ink-faint">Type a reply, / for actions, @ to mention</p>
              <div className="mt-3 flex gap-3 text-ink-muted">
                <PaperclipIcon size={16} />
                <SmileyIcon size={16} />
                <DotsThreeIcon size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: IconCmp, label, bold }: { icon: typeof HouseIcon; label: string; bold?: boolean }) {
  return (
    <div className={cn("flex h-10 items-center gap-3 px-1 text-[14px] text-ink-body", bold && "font-semibold text-ink")}>
      <IconCmp size={18} /> {label}
    </div>
  );
}

function Message({ avatar, name, time, body }: { avatar: string; name: string; time: string; body: string }) {
  return (
    <div className="flex gap-3">
      <Avatar src={avatar} size={36} />
      <div className="min-w-0 rounded-2xl rounded-tl-sm border border-line-soft bg-white px-3.5 py-2.5">
        <p className="text-[12px]">
          <span className="font-semibold text-ink">{name}</span> <span className="text-ink-muted">{time}</span>
        </p>
        <p className="mt-1 text-[12px] leading-[18px] text-ink-body">{body}</p>
      </div>
    </div>
  );
}
