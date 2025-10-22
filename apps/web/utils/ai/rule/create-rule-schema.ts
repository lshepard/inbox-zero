import { z } from "zod";
import { ActionType, LogicalOperator } from "@prisma/client";
import { delayInMinutesSchema } from "@/utils/actions/rule.validation";
import { isMicrosoftProvider } from "@/utils/email/provider-types";
import { isDefined } from "@/utils/types";

const conditionSchema = z
  .object({
    conditionalOperator: z
      .enum([LogicalOperator.AND, LogicalOperator.OR])
      .nullish()
      .describe(
        "The conditional operator to use. AND means all conditions must be true for the rule to match. OR means any condition can be true for the rule to match. This does not impact sub-conditions.",
      ),
    aiInstructions: z
      .string()
      .nullish()
      .describe(
        "Instructions for the AI to determine when to apply this rule. For example: 'Apply this rule to emails about product updates' or 'Use this rule for messages discussing project deadlines'. Be specific about the email content or characteristics that should trigger this rule.",
      ),
    static: z
      .object({
        from: z.string().nullish().describe("The from email address to match"),
        to: z.string().nullish().describe("The to email address to match"),
        subject: z.string().nullish().describe("The subject to match"),
      })
      .nullish()
      .describe(
        "The static conditions to match. If multiple static conditions are specified, the rule will match if ALL of the conditions match (AND operation)",
      ),
  })
  .describe("The conditions to match");

export function getAvailableActions(provider: string) {
  const availableActions: ActionType[] = [
    ActionType.LABEL,
    ...(isMicrosoftProvider(provider) ? [ActionType.MOVE_FOLDER] : []),
    ActionType.ARCHIVE,
    ActionType.MARK_READ,
    ActionType.DRAFT_EMAIL,
    ActionType.REPLY,
    ActionType.FORWARD,
    ActionType.MARK_SPAM,
  ].filter(isDefined);
  return availableActions as [ActionType, ...ActionType[]];
}

export const getExtraActions = () => [
  ActionType.DIGEST,
  ActionType.CALL_WEBHOOK,
];

const actionSchema = (provider: string) =>
  z.object({
    type: z
      .enum([...getAvailableActions(provider), ...getExtraActions()])
      .describe(
        `The type of the action. '${ActionType.DIGEST}' means emails will be added to the digest email the user receives. ${isMicrosoftProvider(provider) ? `'${ActionType.LABEL}' means emails will be categorized in Outlook.` : ""}`,
      ),
    fields: z
      .object({
        label: z.string().nullish().describe("The label to apply to the email"),
        to: z
          .string()
          .nullish()
          .describe("The to email address to send the email to"),
        cc: z
          .string()
          .nullish()
          .describe("The cc email address to send the email to"),
        bcc: z
          .string()
          .nullish()
          .describe("The bcc email address to send the email to"),
        subject: z.string().nullish().describe("The subject of the email"),
        content: z.string().nullish().describe("The content of the email"),
        webhookUrl: z.string().nullish().describe("The webhook URL to call"),
        ...(isMicrosoftProvider(provider) && {
          folderName: z
            .string()
            .nullish()
            .describe("The folder to move the email to"),
        }),
      })
      .nullish()
      .describe(
        "The fields to use for the action. Static text can be combined with dynamic values using double braces {{}}. For example: 'Hi {{sender's name}}' or 'Re: {{subject}}' or '{{when I'm available for a meeting}}'. Dynamic values will be replaced with actual email data when the rule is executed. Dynamic values are generated in real time by the AI. Only use dynamic values where absolutely necessary. Otherwise, use plain static text. A field can be also be fully static or fully dynamic.",
      ),
    delayInMinutes: delayInMinutesSchema,
  });

export const createRuleSchema = (provider: string) =>
  z.object({
    name: z
      .string()
      .describe("The name of the rule. No need to include 'Rule' in the name."),
    condition: conditionSchema,
    actions: z.array(actionSchema(provider)).describe("The actions to take"),
  });

export type CreateRuleSchema = z.infer<ReturnType<typeof createRuleSchema>>;
export type CreateOrUpdateRuleSchema = CreateRuleSchema & {
  ruleId?: string;
};
