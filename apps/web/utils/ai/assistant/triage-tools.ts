import { tool } from "ai";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";
import { createEmailProvider } from "@/utils/email/provider";
import { ThreadTrackerType } from "@prisma/client";
import subDays from "date-fns/subDays";
import { decodeSnippet } from "@/utils/gmail/decode";

const logger = createScopedLogger("ai/assistant/triage-tools");

function trackToolCall({ tool, email }: { tool: string; email: string }) {
  logger.info("Tool call", { tool, email });
}

/**
 * Get today's unread emails with AI-powered importance analysis
 */
export const getTodaysEmailsTool = ({
  email,
  emailAccountId,
}: {
  email: string;
  emailAccountId: string;
}) =>
  tool({
    name: "getTodaysEmails",
    description:
      "Get emails received today (or in the last N hours). Returns unread emails with subject, sender, and snippet. Use this to answer questions about today's inbox or recent important emails.",
    inputSchema: z.object({
      hours: z
        .number()
        .default(24)
        .describe("How many hours back to search (default: 24)"),
      maxResults: z
        .number()
        .default(20)
        .describe("Maximum number of emails to return (default: 20)"),
      unreadOnly: z
        .boolean()
        .default(true)
        .describe("Only return unread emails (default: true)"),
    }),
    execute: async ({ hours, maxResults, unreadOnly }) => {
      trackToolCall({ tool: "get_todays_emails", email });

      const provider = await createEmailProvider({
        emailAccountId,
        provider: "google", // TODO: get from account
      });

      const cutoffDate = subDays(new Date(), hours / 24);

      // Search for recent emails
      const query = unreadOnly
        ? `is:unread after:${Math.floor(cutoffDate.getTime() / 1000)}`
        : `after:${Math.floor(cutoffDate.getTime() / 1000)}`;

      const messages = await provider.searchEmails({
        query,
        maxResults,
      });

      if (!messages || messages.length === 0) {
        return {
          count: 0,
          emails: [],
          summary: `No ${unreadOnly ? "unread " : ""}emails found in the last ${hours} hours.`,
        };
      }

      const emails = messages.map((msg: any) => ({
        id: msg.id,
        threadId: msg.threadId,
        from: msg.headers.from,
        subject: msg.headers.subject || "(No subject)",
        snippet: decodeSnippet(msg.snippet),
        date: msg.headers.date,
        labels: msg.labelIds || [],
        isUnread: msg.labelIds?.includes("UNREAD") ?? false,
      }));

      return {
        count: emails.length,
        emails,
        summary: `Found ${emails.length} ${unreadOnly ? "unread " : ""}emails in the last ${hours} hours.`,
      };
    },
  });

/**
 * Mark an email as needs reply (creates thread tracker)
 */
export const markNeedsReplyTool = ({
  email,
  emailAccountId,
}: {
  email: string;
  emailAccountId: string;
}) =>
  tool({
    name: "markNeedsReply",
    description:
      "Mark an email thread as 'needs reply'. This adds it to the user's reply tracking system so they can manage it later in the Reply Tracker.",
    inputSchema: z.object({
      threadId: z.string().describe("The thread ID to mark as needs reply"),
      messageId: z.string().describe("The message ID within the thread"),
      reason: z
        .string()
        .optional()
        .describe("Optional note about why this needs a reply"),
    }),
    execute: async ({ threadId, messageId, reason }) => {
      trackToolCall({ tool: "mark_needs_reply", email });

      // Check if tracker already exists
      const existing = await prisma.threadTracker.findFirst({
        where: {
          emailAccountId,
          threadId,
          resolved: false,
        },
      });

      if (existing) {
        return {
          success: true,
          message: "This thread is already being tracked",
          trackerId: existing.id,
        };
      }

      // Create new tracker
      const tracker = await prisma.threadTracker.create({
        data: {
          emailAccountId,
          threadId,
          messageId,
          type: ThreadTrackerType.NEEDS_REPLY,
          resolved: false,
          sentAt: new Date(),
          reason: reason || "Marked as needs reply by AI assistant",
        },
      });

      return {
        success: true,
        message:
          "Thread marked as needs reply. You can manage this in your Reply Tracker.",
        trackerId: tracker.id,
      };
    },
  });

/**
 * Create a task from an email by sending to webhook
 */
export const createTaskFromEmailTool = ({
  email,
  emailAccountId,
}: {
  email: string;
  emailAccountId: string;
}) =>
  tool({
    name: "createTaskFromEmail",
    description:
      "Create a task from an email by sending it to the user's configured task management webhook. The webhook should be configured in settings first. Use this when an email requires action that should become a task.",
    inputSchema: z.object({
      threadId: z.string().describe("The thread ID"),
      messageId: z.string().describe("The message ID"),
      taskTitle: z.string().describe("Short title for the task"),
      taskDescription: z
        .string()
        .describe("Description of what needs to be done"),
      priority: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("Task priority level"),
      dueDate: z
        .string()
        .optional()
        .describe("Due date in ISO format (YYYY-MM-DD)"),
    }),
    execute: async ({
      threadId,
      messageId,
      taskTitle,
      taskDescription,
      priority,
      dueDate,
    }) => {
      trackToolCall({ tool: "create_task_from_email", email });

      // Get the webhook URL from user settings
      const emailAccount = await prisma.emailAccount.findUnique({
        where: { id: emailAccountId },
        select: {
          user: {
            select: {
              webhookUrl: true,
            },
          },
        },
      });

      if (!emailAccount?.user?.webhookUrl) {
        return {
          success: false,
          message:
            "No webhook URL configured. Please configure a webhook in Settings to enable task creation.",
        };
      }

      // Get email details
      const provider = await createEmailProvider({
        emailAccountId,
        provider: "google", // TODO: get from account
      });

      const message = await provider.getMessage({ messageId });

      // Send to webhook
      const payload = {
        action: "create_task",
        task: {
          title: taskTitle,
          description: taskDescription,
          priority: priority || "medium",
          dueDate: dueDate || undefined,
        },
        email: {
          threadId,
          messageId,
          subject: message.headers.subject,
          from: message.headers.from,
          snippet: decodeSnippet(message.snippet),
          date: message.headers.date,
        },
      };

      try {
        const response = await fetch(emailAccount.user.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}`);
        }

        return {
          success: true,
          message: `Task created: "${taskTitle}"`,
          webhookResponse: await response.text(),
        };
      } catch (error) {
        logger.error("Error calling task webhook", { error });
        return {
          success: false,
          message: `Failed to create task: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });

/**
 * Get email details including full content
 */
export const getEmailDetailsTool = ({
  email,
  emailAccountId,
}: {
  email: string;
  emailAccountId: string;
}) =>
  tool({
    name: "getEmailDetails",
    description:
      "Get full details of a specific email including complete message content, headers, and thread context. Use this when you need to deeply analyze an email's content.",
    inputSchema: z.object({
      messageId: z.string().describe("The message ID to retrieve"),
      includeThread: z
        .boolean()
        .default(false)
        .describe("Include other messages in the thread"),
    }),
    execute: async ({ messageId, includeThread }) => {
      trackToolCall({ tool: "get_email_details", email });

      const provider = await createEmailProvider({
        emailAccountId,
        provider: "google", // TODO: get from account
      });

      const message = await provider.getMessage({ messageId });

      const result: any = {
        id: message.id,
        threadId: message.threadId,
        from: message.headers.from,
        to: message.headers.to,
        cc: message.headers.cc,
        subject: message.headers.subject,
        date: message.headers.date,
        snippet: decodeSnippet(message.snippet),
        textPlain: message.textPlain,
        textHtml: message.textHtml,
        labels: message.labelIds,
        attachments: message.attachments?.map((a: any) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
        })),
      };

      if (includeThread) {
        const thread = await provider.getThread({ threadId: message.threadId });
        result.thread = thread.messages.map((msg: any) => ({
          id: msg.id,
          from: msg.headers.from,
          subject: msg.headers.subject,
          date: msg.headers.date,
          snippet: decodeSnippet(msg.snippet),
        }));
      }

      return result;
    },
  });

/**
 * Get inbox statistics
 */
export const getInboxStatsTool = ({
  email,
  emailAccountId,
}: {
  email: string;
  emailAccountId: string;
}) =>
  tool({
    name: "getInboxStats",
    description:
      "Get statistics about the user's inbox including unread count, threads needing reply, threads awaiting reply, and threads needing action.",
    inputSchema: z.object({}),
    execute: async () => {
      trackToolCall({ tool: "get_inbox_stats", email });

      const [trackers, emailAccount] = await Promise.all([
        prisma.threadTracker.groupBy({
          by: ["type"],
          where: {
            emailAccountId,
            resolved: false,
          },
          _count: true,
        }),
        prisma.emailAccount.findUnique({
          where: { id: emailAccountId },
          select: {
            account: {
              select: {
                access_token: true,
              },
            },
          },
        }),
      ]);

      const trackerCounts = Object.fromEntries(
        trackers.map((t) => [t.type, t._count]),
      );

      let unreadCount = null;
      if (emailAccount?.account.access_token) {
        try {
          const provider = await createEmailProvider({
            emailAccountId,
            provider: "google", // TODO: get from account
          });

          const unreadMessages = await provider.searchEmails({
            query: "is:unread in:inbox",
            maxResults: 1, // We just need the count
          });

          // Get actual count from response
          unreadCount = unreadMessages?.length || 0;
        } catch (error) {
          logger.error("Error getting unread count", { error });
        }
      }

      return {
        unreadInInbox: unreadCount,
        needsReply: trackerCounts[ThreadTrackerType.NEEDS_REPLY] || 0,
        awaitingReply: trackerCounts[ThreadTrackerType.AWAITING] || 0,
        needsAction: trackerCounts[ThreadTrackerType.NEEDS_ACTION] || 0,
        summary: `You have ${unreadCount !== null ? `${unreadCount} unread emails, ` : ""}${trackerCounts[ThreadTrackerType.NEEDS_REPLY] || 0} threads needing reply, ${trackerCounts[ThreadTrackerType.AWAITING] || 0} awaiting reply, and ${trackerCounts[ThreadTrackerType.NEEDS_ACTION] || 0} needing action.`,
      };
    },
  });
