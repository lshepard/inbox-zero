import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { hasPostCronSecret } from "@/utils/cron";
import { captureException } from "@/utils/error";
import { createScopedLogger } from "@/utils/logger";
import { processRecentEmails } from "./process-recent-emails";

const logger = createScopedLogger("api/email/process-recent");

export const maxDuration = 300;

export const POST = withError(async (request) => {
  if (!(await hasPostCronSecret(request))) {
    captureException(
      new Error("Unauthorized cron request: api/email/process-recent"),
    );
    return new Response("Unauthorized", { status: 401 });
  }

  logger.info("Starting hourly email processing backstop");

  const results = await processRecentEmails();

  logger.info("Completed hourly email processing backstop", { results });

  return NextResponse.json(results);
});
