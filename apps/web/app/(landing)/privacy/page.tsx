import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy & Terms of Service - Confabulous Inbox",
  description: "Privacy Policy & Terms of Service - Confabulous Inbox",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        Privacy Policy & Terms of Service
      </h1>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            Private Use Only
          </h2>
          <p>
            Confabulous Inbox is not available for public use. This service is
            for private use only and access is restricted to invited users.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            Access Policy
          </h2>
          <p>
            Your information is only accessible if you have been invited by the
            owners of this website. Unauthorized access is prohibited.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            Data Privacy
          </h2>
          <p>
            All user data is kept private and is only accessible to authorized
            users who have been explicitly invited to use this service.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <Link href="/" className="text-blue-600 underline hover:text-blue-800">
          Back to home
        </Link>
      </div>
    </div>
  );
}
