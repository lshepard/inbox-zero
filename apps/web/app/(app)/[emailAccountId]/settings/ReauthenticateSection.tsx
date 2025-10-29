"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSection, FormSectionLeft } from "@/components/Form";
import { toastError } from "@/components/Toast";
import { useAccount } from "@/providers/EmailAccountProvider";
import type { GetAuthLinkUrlResponse } from "@/app/api/google/linking/auth-url/route";
import type { GetOutlookAuthLinkUrlResponse } from "@/app/api/outlook/linking/auth-url/route";

export function ReauthenticateSection() {
  const { emailAccount, provider } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const handleReauthenticate = async () => {
    setIsLoading(true);

    try {
      if (provider === "google") {
        const response = await fetch("/api/google/linking/auth-url", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to get auth URL");
        }

        const data: GetAuthLinkUrlResponse = await response.json();
        window.location.href = data.url;
      } else if (provider === "microsoft") {
        const response = await fetch(
          "/api/outlook/linking/auth-url?action=merge",
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to get auth URL");
        }

        const data: GetOutlookAuthLinkUrlResponse = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error initiating reauthentication:", error);
      toastError({
        title: "Error initiating reauthentication",
        description: "Please try again or contact support",
      });
      setIsLoading(false);
    }
  };

  return (
    <FormSection>
      <FormSectionLeft
        title="Email Provider"
        description={`You are connected with ${provider === "google" ? "Google" : "Microsoft"}${emailAccount?.email ? ` (${emailAccount.email})` : ""}. If you're experiencing authentication issues, you can reauthenticate your account.`}
      />
      <div className="flex items-center">
        <Button
          variant="outline"
          onClick={handleReauthenticate}
          loading={isLoading}
          Icon={RefreshCw}
        >
          Reauthenticate
        </Button>
      </div>
    </FormSection>
  );
}
