import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { params }) => {
  const { emailAccountId } = await params;
  const userId = request.auth.userId;

  // Verify the email account belongs to this user
  const emailAccount = await prisma.emailAccount.findFirst({
    where: {
      id: emailAccountId,
      userId,
    },
    select: {
      watchEmailsSubscriptionId: true,
      watchEmailsExpirationDate: true,
    },
  });

  if (!emailAccount) {
    return NextResponse.json(
      { error: "Email account not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    isWatching: !!emailAccount.watchEmailsSubscriptionId,
    subscriptionId: emailAccount.watchEmailsSubscriptionId,
    expirationDate: emailAccount.watchEmailsExpirationDate,
  });
});
