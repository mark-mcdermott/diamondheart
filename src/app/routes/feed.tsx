import { ArrowLeft } from "lucide-react";
import { Link } from "@/app/link";
import { FeedPageClient } from "@/app/sections/feed/feed-page-client";

export function FeedRoute() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Community</h2>
          <p className="text-muted-foreground mt-1">Recent meditations from the Diamondheart community</p>
        </div>
      </div>
      <FeedPageClient />
    </div>
  );
}
