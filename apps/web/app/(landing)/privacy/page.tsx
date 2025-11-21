import type { Metadata } from "next";
import { PrivacyContent } from "@/app/(landing)/privacy/content";

export const metadata: Metadata = {
  title: "Privacy Policy - Confabulous Inbox",
  description: "Privacy Policy - Confabulous Inbox",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <PrivacyContent />;
}
