import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NeedBadge } from "@/components/status-badges";
import { programs } from "@/lib/placeholder";

export const metadata = {
  title: "Programs & capacity",
};

export default function OrganizationProgramsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          Programs & capacity
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          What Harbor House can offer right now. These cards are layout only —
          live bed counts and meal totals will plug in later.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {programs.map((program) => {
          const percent = Math.round((program.open / program.capacity) * 100);
          return (
            <Card key={program.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{program.name}</CardTitle>
                  <NeedBadge need={program.category} />
                </div>
                <CardDescription>{program.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <p>
                    <span className="font-heading text-2xl">{program.open}</span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      open of {program.capacity}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{program.hours}</p>
                </div>
                <Progress value={percent} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
