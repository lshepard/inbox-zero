import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";
import { getGmailClientWithRefresh } from "@/utils/gmail/client";
import { GmailProvider } from "@/utils/email/google";
import { OutlookProvider } from "@/utils/email/microsoft";
import { getMessages } from "@/utils/gmail/message";
import { getOutlookClientWithRefresh } from "@/utils/outlook/client";
import { processHistoryItem } from "@/utils/webhook/process-history-item";
import type { EmailAccount } from "@/generated/prisma/client";

const logger = createScopedLogger("process-recent-emails");

export async function processRecentEmails() {
  const startTime = Date.now();

  // Find all premium email accounts
  const emailAccounts = await prisma.emailAccount.findMany({
    where: {
      user: {
        premium: {
          OR: [
            { lemonSqueezyRenewsAt: { gt: new Date() } },
            { stripeSubscriptionStatus: { in: ["active", "trialing"] } },
          ],
        },
      },
    },
    include: {
      account: true,
      user: true,
      rules: {
        where: { enabled: true },
        include: {
          actions: true,
        },
      },
    },
  });

  logger.info("Processing recent emails for premium users", {
    accountCount: emailAccounts.length,
  });

  const results = await Promise.all(
    emailAccounts.map((emailAccount) =>
      processRecentEmailsForAccount(emailAccount).catch((error) => {
        logger.error("Error processing recent emails for account", {
          emailAccountId: emailAccount.id,
          email: emailAccount.email,
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          emailAccountId: emailAccount.id,
          email: emailAccount.email,
          error: error instanceof Error ? error.message : String(error),
          processed: 0,
        };
      }),
    ),
  );

  const processingTimeMs = Date.now() - startTime;
  const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
  const errors = results.filter((r) => "error" in r && r.error).length;

  logger.info("Completed processing recent emails", {
    processingTimeMs,
    totalProcessed,
    errors,
  });

  return {
    success: true,
    accountsProcessed: emailAccounts.length,
    totalEmailsProcessed: totalProcessed,
    errors,
    results,
  };
}

async function processRecentEmailsForAccount(
  emailAccount: EmailAccount & {
    account: { provider?: string | null } | null;
    user: { email: string };
    rules: Array<{
      id: string;
      actions: unknown[];
    }>;
  },
) {
  const accountLogger = logger.with({
    emailAccountId: emailAccount.id,
    email: emailAccount.email,
  });

  if (
    !emailAccount.account?.access_token ||
    !emailAccount.account?.refresh_token
  ) {
    accountLogger.warn("Missing tokens, skipping");
    return {
      emailAccountId: emailAccount.id,
      email: emailAccount.email,
      processed: 0,
      skipped: true,
      reason: "missing_tokens",
    };
  }

  const provider = emailAccount.account.provider || "google";
  const hasAutomationRules = emailAccount.rules.length > 0;
  const hasAiAccess = emailAccount.aiEnabled;

  if (!hasAutomationRules && !hasAiAccess) {
    accountLogger.info("No automation rules or AI access, skipping");
    return {
      emailAccountId: emailAccount.id,
      email: emailAccount.email,
      processed: 0,
      skipped: true,
      reason: "no_automation_or_ai",
    };
  }

  accountLogger.info("Processing recent emails", {
    provider,
    hasAutomationRules,
    hasAiAccess,
  });

  if (provider === "google") {
    return processRecentGmailMessages({
      emailAccount,
      hasAutomationRules,
      hasAiAccess,
      logger: accountLogger,
    });
  }

  if (provider === "outlook") {
    return processRecentOutlookMessages({
      emailAccount,
      hasAutomationRules,
      hasAiAccess,
      logger: accountLogger,
    });
  }

  accountLogger.warn("Unknown provider", { provider });
  return {
    emailAccountId: emailAccount.id,
    email: emailAccount.email,
    processed: 0,
    skipped: true,
    reason: "unknown_provider",
  };
}

async function processRecentGmailMessages({
  emailAccount,
  hasAutomationRules,
  hasAiAccess,
  logger: accountLogger,
}: {
  emailAccount: EmailAccount & {
    account: {
      access_token: string;
      refresh_token: string;
      expires_at?: Date | null;
    } | null;
    rules: Array<{ id: string; actions: unknown[] }>;
  };
  hasAutomationRules: boolean;
  hasAiAccess: boolean;
  logger: ReturnType<typeof createScopedLogger>;
}) {
  const gmail = await getGmailClientWithRefresh({
    accessToken: emailAccount.account!.access_token,
    refreshToken: emailAccount.account!.refresh_token,
    expiresAt: emailAccount.account!.expires_at?.getTime() || null,
    emailAccountId: emailAccount.id,
  });

  const provider = new GmailProvider(gmail, accountLogger);

  // Get messages from the last 2 hours in inbox or sent
  // Using Gmail query syntax: newer_than:2h
  const { messages } = await getMessages(gmail, {
    query: "newer_than:2h (in:inbox OR in:sent)",
    maxResults: 100,
  });

  accountLogger.info("Found recent messages", { count: messages.length });

  let processed = 0;

  for (const message of messages) {
    try {
      await processHistoryItem(
        {
          messageId: message.id,
          threadId: message.threadId,
        },
        {
          provider,
          rules: emailAccount.rules as any,
          hasAutomationRules,
          hasAiAccess,
          emailAccount: emailAccount as any,
          logger: accountLogger,
        },
      );
      processed++;
    } catch (error) {
      accountLogger.error("Error processing message", {
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  accountLogger.info("Completed processing recent messages", { processed });

  return {
    emailAccountId: emailAccount.id,
    email: emailAccount.email,
    processed,
  };
}

async function processRecentOutlookMessages({
  emailAccount,
  hasAutomationRules,
  hasAiAccess,
  logger: accountLogger,
}: {
  emailAccount: EmailAccount & {
    account: {
      access_token: string;
      refresh_token: string;
      expires_at?: Date | null;
    } | null;
    rules: Array<{ id: string; actions: unknown[] }>;
  };
  hasAutomationRules: boolean;
  hasAiAccess: boolean;
  logger: ReturnType<typeof createScopedLogger>;
}) {
  const outlookClient = await getOutlookClientWithRefresh({
    accessToken: emailAccount.account!.access_token,
    refreshToken: emailAccount.account!.refresh_token,
    expiresAt: emailAccount.account!.expires_at?.getTime() || null,
    emailAccountId: emailAccount.id,
  });

  const provider = new OutlookProvider(outlookClient, accountLogger);

  // Get messages from the last 2 hours
  // Using Microsoft Graph API filter
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const filterDate = twoHoursAgo.toISOString();

  // Get the Graph client for making API calls
  const graphClient = outlookClient.getClient();

  // Fetch recent messages from Inbox and Sent Items
  const inboxMessagesPromise = graphClient
    .api("/me/mailFolders/inbox/messages")
    .filter(`receivedDateTime ge ${filterDate}`)
    .top(50)
    .get();

  const sentMessagesPromise = graphClient
    .api("/me/mailFolders/sentitems/messages")
    .filter(`sentDateTime ge ${filterDate}`)
    .top(50)
    .get();

  const [inboxResponse, sentResponse] = await Promise.all([
    inboxMessagesPromise,
    sentMessagesPromise,
  ]);

  const messages = [
    ...(inboxResponse.value || []),
    ...(sentResponse.value || []),
  ];

  accountLogger.info("Found recent messages", { count: messages.length });

  let processed = 0;

  for (const message of messages) {
    try {
      await processHistoryItem(
        {
          messageId: message.id,
          threadId: message.conversationId,
        },
        {
          provider,
          rules: emailAccount.rules as any,
          hasAutomationRules,
          hasAiAccess,
          emailAccount: emailAccount as any,
          logger: accountLogger,
        },
      );
      processed++;
    } catch (error) {
      accountLogger.error("Error processing message", {
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  accountLogger.info("Completed processing recent messages", { processed });

  return {
    emailAccountId: emailAccount.id,
    email: emailAccount.email,
    processed,
  };
}
