import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { exercises, personalRecords } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";

export default async function RecordsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const records = await db
    .select({
      id: personalRecords.id,
      exerciseId: personalRecords.exerciseId,
      repCount: personalRecords.repCount,
      weight: personalRecords.weight,
      unit: personalRecords.unit,
      date: personalRecords.date,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
    })
    .from(personalRecords)
    .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
    .where(eq(personalRecords.userId, session.userId))
    .orderBy(exercises.muscleGroup, exercises.name, personalRecords.repCount);

  const muscleGroups = [...new Set(records.map((r) => r.muscleGroup))].sort();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/workout" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Personal Records</h2>
          <p className="text-muted-foreground mt-1">
            Your best lifts by exercise and rep count
          </p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No personal records yet. Start logging workouts to track your PRs.
          </p>
          <Button asChild>
            <Link href="/workout">Start Workout</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {muscleGroups.map((group) => {
            const groupRecords = records.filter((r) => r.muscleGroup === group);
            const exerciseNames = [...new Set(groupRecords.map((r) => r.exerciseName))];

            return (
              <section key={group}>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  {group}
                </h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Exercise</th>
                        <th className="text-left px-4 py-3 font-medium">Reps</th>
                        <th className="text-left px-4 py-3 font-medium">Weight</th>
                        <th className="text-left px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {exerciseNames.map((name) => {
                        const exRecords = groupRecords.filter(
                          (r) => r.exerciseName === name
                        );
                        return exRecords.map((record, i) => (
                          <tr key={record.id}>
                            {i === 0 && (
                              <td
                                className="px-4 py-3 font-medium"
                                rowSpan={exRecords.length}
                              >
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-primary" />
                                  {name}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-3">{record.repCount} reps</td>
                            <td className="px-4 py-3 font-medium">
                              {record.weight} {record.unit}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {new Date(record.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
