import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamMember {
  name: string;
  role: string;
  image?: string;
  bio?: string;
}

interface TeamProps {
  title?: string;
  team: TeamMember[];
  columns?: 2 | 3 | 4;
}

const colsClass = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function Team({ title, team, columns = 3 }: TeamProps) {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        {title && (
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            {title}
          </h2>
        )}
        <div className={`grid gap-8 ${colsClass[columns]}`}>
          {team.map((member, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <Avatar className="mb-4 h-24 w-24">
                {member.image && (
                  <AvatarImage src={member.image} alt={member.name} />
                )}
                <AvatarFallback className="text-lg">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.role}</p>
              {member.bio && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {member.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
