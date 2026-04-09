import { notFound } from "next/navigation";
import { db } from "@/db";
import { users, workouts, workoutSets, foodLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) notFound();

  const [workoutCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(eq(workouts.userId, id));

  const [setCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .where(eq(workouts.userId, id));

  const [mealCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(foodLog)
    .where(eq(foodLog.userId, id));

  const joinedDate = user.createdAt.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <Button variant="outline" size="sm" asChild className="mb-8">
        <Link href="/">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Link>
      </Button>

      <div className="text-center mb-8">
        {user.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt={user.name || "User"}
            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
          />
        )}
        <h1>{user.name || "Anonymous"}</h1>
        <p className="text-muted-foreground mt-1">Joined {joinedDate}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Workouts", value: workoutCount?.count ?? 0 },
          { label: "Sets Logged", value: setCount?.count ?? 0 },
          { label: "Meals Logged", value: mealCount?.count ?? 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-border rounded-lg p-4 text-center"
          >
            <p className="text-2xl font-semibold">{String(stat.value)}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
