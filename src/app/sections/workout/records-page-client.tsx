import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Dumbbell } from "lucide-react";
import { api, keys, type PersonalRecordView } from "@/app/api";
import { Link } from "@/app/link";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryGate } from "@/components/ui/query-gate";
import { Skeleton } from "@/components/ui/skeleton";

function Header() {
  return (
    <div className="flex items-center gap-4 mb-8">
      <Link href="/workout" className="text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div>
        <h2>Personal Records</h2>
        <p className="text-muted-foreground mt-1">Your best lifts by exercise and rep count</p>
      </div>
    </div>
  );
}

function RecordsTable({ records }: { records: PersonalRecordView[] }) {
  const muscleGroups = [...new Set(records.map((r) => r.muscleGroup))].sort();
  if (records.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No personal records yet"
        description="Start logging workouts to track your PRs."
        actionLabel="Start Workout"
        actionHref="/workout"
      />
    );
  }
  return (
    <div className="space-y-8">
      {muscleGroups.map((group) => {
        const groupRecords = records.filter((r) => r.muscleGroup === group);
        const exerciseNames = [...new Set(groupRecords.map((r) => r.exerciseName))];
        return (
          <section key={group}>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{group}</h3>
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
                    const exRecords = groupRecords.filter((r) => r.exerciseName === name);
                    return exRecords.map((record, i) => (
                      <tr key={record.id}>
                        {i === 0 && (
                          <td className="px-4 py-3 font-medium" rowSpan={exRecords.length}>
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
                          {new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
  );
}

export function RecordsPageClient() {
  const records = useQuery({ queryKey: keys.records, queryFn: api.workout.records });
  return (
    <div className="max-w-4xl mx-auto">
      <Header />
      <QueryGate query={records} title="Records could not be loaded" skeleton={<Skeleton className="h-64 rounded-lg" />}>
        {(data) => <RecordsTable records={data} />}
      </QueryGate>
    </div>
  );
}
