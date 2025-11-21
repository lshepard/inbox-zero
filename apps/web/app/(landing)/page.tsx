import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-medium text-gray-900">
          Confabulous Inbox
        </h1>
        <p className="mb-6 text-gray-600">Private email management system</p>
        <div className="space-y-2">
          <div>
            <Link
              href="/login"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Log in
            </Link>
          </div>
          <div>
            <Link
              href="/privacy"
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Privacy Policy & Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
