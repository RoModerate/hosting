import fs from "node:fs/promises";
import path from "node:path";
import type { Message, OmitPartialGroupDMChannel } from "discord.js";
import { logger } from "../lib/logger";
import { getTicketByChannelId } from "./tickets";
import { hostUploadedZip, MAX_ZIP_BYTES, ticketUploadDir } from "./hosting/runner";
import { formatResultMessage } from "./resultFormat";

export async function handleAttachmentMessage(
  message: OmitPartialGroupDMChannel<Message>,
): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.attachments.size === 0) return;

  const ticket = await getTicketByChannelId(message.channelId);
  if (!ticket || ticket.status !== "open") return;

  const zipAttachment = message.attachments.find((a) =>
    a.name?.toLowerCase().endsWith(".zip"),
  );
  if (!zipAttachment) return;

  if (zipAttachment.size > MAX_ZIP_BYTES) {
    await message.reply(
      `That file is too large. The maximum accepted size is ${Math.floor(MAX_ZIP_BYTES / (1024 * 1024))}MB.`,
    );
    return;
  }

  const statusMessage = await message.reply("Received your upload. Downloading and extracting...");

  try {
    const response = await fetch(zipAttachment.url);
    if (!response.ok) {
      await statusMessage.edit(`Could not download the attachment (HTTP ${response.status}).`);
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    const uploadDir = ticketUploadDir(ticket.id);
    await fs.mkdir(uploadDir, { recursive: true });
    const fileName = zipAttachment.name ?? `upload-${Date.now()}.zip`;
    const zipPath = path.join(uploadDir, fileName);
    await fs.writeFile(zipPath, buffer);

    await statusMessage.edit("Extracted. Installing dependencies and starting the bot...");

    const result = await hostUploadedZip({
      ticketId: ticket.id,
      zipPath,
      fileName,
      onCrash: (info) => {
        message.channel
          .send(
            `The hosted bot stopped unexpectedly (exit code ${info.exitCode ?? "unknown"}). Use /restart to bring it back up.`,
          )
          .catch(() => undefined);
      },
    });

    await statusMessage.edit(formatResultMessage(result));
  } catch (err) {
    logger.error({ err, ticketId: ticket.id }, "Failed to host uploaded zip");
    await statusMessage
      .edit("An unexpected error occurred while processing your upload. Staff has been notified.")
      .catch(() => undefined);
  }
}
