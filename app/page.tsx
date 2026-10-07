import { redirect } from "next/navigation";
import { HOME_ROUTE } from "@/lib/auth-routes";

export default function Home() {
  redirect(HOME_ROUTE);
}
