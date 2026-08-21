import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { connectedPeople } from "@/lib/placeholder";

export const metadata = {
  title: "People connected",
};

export default function OrganizationPeoplePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          People connected
        </h1>
        <p className="mt-2 text-muted-foreground">
          Participants currently linked to a Harbor House program. Names here
          are sample copy for the interface.
        </p>
      </div>
      <div className="space-y-3">
        {connectedPeople.map((person) => (
          <Card key={person.id}>
            <CardContent className="flex items-start gap-3">
              <Avatar size="lg">
                <AvatarFallback>{person.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{person.name}</p>
                <CardDescription>{person.program}</CardDescription>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <p>With you: {person.since}</p>
                  <p>Next: {person.nextStep}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
