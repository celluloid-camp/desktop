import { Trans } from "@lingui/react/macro";
import { ArrowLeftRight, Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
              Move a video from one site to another, like YouTube to Vimeo or
              Dailymotion to Vevo.
            </Trans>
          ) : (
            <Trans>
              Pick a video on your computer and send it to your Celluloid
              account.
            </Trans>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Empty className="border border-dashed border-border bg-white/50">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              <Trans>Coming soon</Trans>
            </EmptyTitle>
            <EmptyDescription>
              {kind === "transfer" ? (
                <Trans>Site-to-site transfer isn’t available yet.</Trans>
              ) : (
                <Trans>Upload to Celluloid isn’t available yet.</Trans>
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
