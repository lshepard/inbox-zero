import type { Metadata } from "next";
import { TermsContent } from "@/app/(landing)/terms/content";

export const metadata: Metadata = {
  title: "Terms of Service - Confabulous Inbox",
  description: "Terms of Service - Confabulous Inbox",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <TermsContent />;
}
