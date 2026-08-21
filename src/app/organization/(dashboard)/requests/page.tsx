import { RequestsPanel } from "@/components/organization/requests-panel";

export const metadata = {
  title: "Incoming requests",
};

export default function OrganizationRequestsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          Incoming requests
        </h1>
        <p className="mt-2 text-muted-foreground">
          Participants asking to connect with Harbor House. Connect or waitlist
          to preview how staff will handle the queue.
        </p>
      </div>
      <RequestsPanel />
    </div>
  );
}
