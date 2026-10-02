import { redirect } from "next/navigation";
import { DEFAULT_INBOX } from "@/lib/ticket-routes";

export default function InboxPage() {
  redirect(`/inbox/${DEFAULT_INBOX}`);
}
