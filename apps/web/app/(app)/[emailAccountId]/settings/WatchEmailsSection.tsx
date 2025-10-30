"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormSection, FormSectionLeft } from "@/components/Form";
import { useAccount } from "@/providers/EmailAccountProvider";
import useSWR from "swr";

type WatchStatus = {
  isWatching: boolean;
  expirationDate: string | null;
  subscriptionId: string | null;
};

export function WatchEmailsSection() {
  const { emailAccountId } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current watch status from email account
  const { data, mutate } = useSWR<WatchStatus>(
    `/api/user/email-account/${emailAccountId}/watch-status`,
  );

  const handleWatch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/watch", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to enable email watching");
      }

      const result = await response.json();
      toast.success(
        "Email watching enabled! Your inbox will now process incoming emails automatically.",
      );
      mutate();
    } catch (error) {
      toast.error(
        `Error enabling email watching: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [mutate]);

  const handleUnwatch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/watch/unwatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to disable email watching");
      }

      toast.success(
        "Email watching disabled. Incoming emails will queue up until you re-enable watching.",
      );
      mutate();
    } catch (error) {
      toast.error(
        `Error disabling email watching: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [mutate]);

  const isWatching = !!data?.subscriptionId;

  return (
    <FormSection>
      <FormSectionLeft
        title="Email Watching"
        description={
          isWatching
            ? "Your inbox is currently being watched. Incoming emails are processed automatically. Disable watching to pause processing (emails will queue up)."
            : "Email watching is disabled. Enable it to automatically process incoming emails via Google Pub/Sub."
        }
      />

      <div className="flex flex-col gap-2">
        {isWatching ? (
          <>
            {data?.expirationDate && (
              <div className="text-sm text-gray-600">
                Watch expires: {new Date(data.expirationDate).toLocaleString()}
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleUnwatch}
              disabled={isLoading}
            >
              {isLoading ? "Disabling..." : "Disable Email Watching"}
            </Button>
          </>
        ) : (
          <Button variant="default" onClick={handleWatch} disabled={isLoading}>
            {isLoading ? "Enabling..." : "Enable Email Watching"}
          </Button>
        )}
      </div>
    </FormSection>
  );
}
