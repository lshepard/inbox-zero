import { GroupItemType } from "@prisma/client";
import { z } from "zod";

export const groupEmailsQuerySchema = z.object({
  pageToken: z.string().optional(),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
  email: z.string().optional(),
});

export const groupEmailsResponseSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      threadId: z.string(),
      labelIds: z.array(z.string()).optional(),
      snippet: z.string(),
      historyId: z.string(),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            mimeType: z.string(),
            size: z.number(),
            attachmentId: z.string(),
            headers: z.object({
              "content-type": z.string(),
              "content-description": z.string(),
            }),
          }),
        )
        .optional(),
      inline: z.array(
        z.object({
          filename: z.string(),
          mimeType: z.string(),
          size: z.number(),
          attachmentId: z.string(),
          headers: z.object({
            "content-type": z.string(),
            "content-description": z.string(),
          }),
        }),
      ),
      headers: z.object({
        subject: z.string(),
        from: z.string(),
        to: z.string(),
        cc: z.string().optional(),
        bcc: z.string().optional(),
        date: z.string(),
        "message-id": z.string().optional(),
        "reply-to": z.string().optional(),
        "in-reply-to": z.string().optional(),
        references: z.string().optional(),
      }),
      textPlain: z.string().optional(),
      textHtml: z.string().optional(),
      matchingGroupItem: z
        .object({
          id: z.string(),
          type: z.enum([
            GroupItemType.FROM,
            GroupItemType.SUBJECT,
            GroupItemType.BODY,
          ]),
          value: z.string(),
        })
        .nullish(),
    }),
  ),
  nextPageToken: z.string().optional(),
});
export type GroupEmailsResult = z.infer<typeof groupEmailsResponseSchema>;
