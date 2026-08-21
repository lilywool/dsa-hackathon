import { AuthFrame } from "@/components/auth/auth-frame";
import { ReviewUnlockForm } from "@/components/auth/review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decideApplication, signOutReview } from "@/lib/auth/actions";
import { getReviewPassword } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { needShortLabels, type NeedType } from "@/lib/placeholder";

export const metadata = {
  title: "Review applications",
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const reviewPassword = await getReviewPassword();

  if (!reviewPassword) {
    return (
      <AuthFrame
        title="Review organization applications"
        description="Enter the review password to see pending tickets and issue organization IDs."
      >
        <ReviewUnlockForm />
      </AuthFrame>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_list_applications", {
    review_password: reviewPassword,
  });

  if (error) {
    return (
      <AuthFrame
        title="Review organization applications"
        description="That review session is no longer valid. Enter the password again."
      >
        <ReviewUnlockForm />
      </AuthFrame>
    );
  }

  const applications = data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Applications</h1>
          <p className="mt-2 text-muted-foreground">
            Approve a ticket to issue an organization ID.
          </p>
        </div>
        <form action={signOutReview}>
          <Button variant="outline">Lock review</Button>
        </form>
      </div>
      {params.error ? (
        <p className="mt-4 text-sm text-destructive">
          That decision could not be saved. Try again.
        </p>
      ) : null}
      <ul className="mt-8 space-y-4">
        {applications.length === 0 ? (
          <li className="rounded-2xl bg-card p-6 text-muted-foreground ring-1 ring-foreground/10">
            No applications yet.
          </li>
        ) : (
          applications.map((application) => (
            <li
              key={application.id}
              className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{application.organization_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.location} · {application.contact_email}
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {application.services.map((service) => (
                  <Badge key={service} variant="secondary">
                    {needShortLabels[service as NeedType] ?? service}
                  </Badge>
                ))}
              </div>
              {application.org_id ? (
                <p className="mt-3 font-mono text-sm">{application.org_id}</p>
              ) : null}
              {application.status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <form action={decideApplication}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <input type="hidden" name="approve" value="true" />
                    <Button type="submit">Approve and issue ID</Button>
                  </form>
                  <form action={decideApplication}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <input type="hidden" name="approve" value="false" />
                    <Button type="submit" variant="outline">
                      Deny
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "pending" ? "Pending" : status === "approved" ? "Approved" : "Denied";
  return <Badge variant={status === "approved" ? "default" : "outline"}>{label}</Badge>;
}
