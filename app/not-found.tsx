import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/state-panels";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={CompassIcon}
        title="This page isn't available"
        hint="The page may have moved, or the module isn't part of Desk yet."
        action={
          <Button asChild>
            <Link href="/tickets">Go to tickets</Link>
          </Button>
        }
      />
    </div>
  );
}
