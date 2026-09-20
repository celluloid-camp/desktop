import { Trans } from "@lingui/react/macro";
import { ArrowLeftRight, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlaceholderViewProps = {
  kind: "transfer" | "upload";
};

export function PlaceholderView({ kind }: PlaceholderViewProps) {
  const Icon = kind === "transfer" ? ArrowLeftRight : Upload;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-pretty">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {kind === "transfer" ? (
            <Trans>Transfer</Trans>
          ) : (
            <Trans>Upload</Trans>
          )}
        </CardTitle>
        <CardDescription>
          {kind === "transfer" ? (
            <Trans>
              Move a video from one media platform to another — for example
              YouTube to Vimeo, or Dailymotion to Vevo.
            </Trans>
          ) : (
            <Trans>
              Choose a local video file and send it to your Celluloid account.
            </Trans>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="rounded-lg bg-muted/60 px-3 py-4 text-sm text-muted-foreground ring-1 ring-foreground/5">
          <Trans>Coming soon.</Trans>
        </p>
      </CardContent>
    </Card>
  );
}
