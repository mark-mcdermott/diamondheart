import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { FeedPageClient } from "./feed-page-client";

export const metadata = { title: "Community · Diamondheart" };

/** Reads `GET /api/feed` and the presence endpoint from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function FeedPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Community</h2>
          <p className="text-muted-foreground mt-1">
            Recent meditations from the Diamondheart community
          </p>
        </div>
      </div>
      <FeedPageClient />
    </div>
  );
}
