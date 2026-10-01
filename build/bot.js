import { Bot, InlineKeyboard, InputFile, webhookCallback } from "grammy";
import { extractMedia } from "./extract.js";
import dotenv from "dotenv";
import fs from "node:fs";
import { downloadVideo } from "./extract.js";
import { fastify } from "fastify";
import { initYtDlp } from "./ytdlp.js";
dotenv.config();
const bot = new Bot(process.env.BOT_TOKEN);
// Per-chat state, keyed by chat id like grammY's session plugin. A plain Map instead
// of the session plugin because the slow work below runs after the webhook request
// has ended, when the session plugin has already saved and would drop later writes.
const chatState = new Map();
// Run slow work (yt-dlp, uploads) in the background so the handler returns at once.
// Otherwise webhookCallback times out after 10s, responds 500, and Telegram keeps
// re-sending the same update.
function runInBackground(task) {
    task().catch((err) => console.error("Background task failed:", err));
}
// /start
bot.command("start", async (ctx) => {
    await ctx.reply("📥 Send a Twitter/X or Instagram media URL");
});
// Handle URL messages
bot.on("message:text", async (ctx) => {
    const url = ctx.message.text.trim();
    if (!/^https?:\/\//.test(url))
        return;
    if (!url.includes("twitter.com") &&
        !url.includes("x.com") &&
        !url.includes("instagram.com")) {
        return;
    }
    const chatId = ctx.chat.id;
    const status = await ctx.reply("🔍 Fetching media...");
    runInBackground(async () => {
        try {
            const data = await extractMedia(url);
            if (!data.formats.length) {
                await ctx.api.editMessageText(chatId, status.message_id, "❌ No downloadable media found");
                return;
            }
            chatState.set(chatId, { media: data, mediaSourceUrl: url });
            const kb = new InlineKeyboard();
            for (const f of data.formats) {
                kb.text(`🎬 ${f.quality}`, `q|${f.id}`).row();
            }
            await ctx.api.editMessageText(chatId, status.message_id, "Select quality:", {
                reply_markup: kb,
            });
        }
        catch (err) {
            console.error(err);
            await ctx.api.editMessageText(chatId, status.message_id, "❌ Failed to extract media");
        }
    });
});
// Handle quality selection
bot.callbackQuery(/^q\|/, async (ctx) => {
    const id = ctx.callbackQuery.data.split("|")[1];
    const chatId = ctx.chat?.id;
    const state = chatId === undefined ? undefined : chatState.get(chatId);
    const session = state?.media;
    // IMPORTANT: original source URL, NOT format URL
    const sourceUrl = state?.mediaSourceUrl;
    if (chatId === undefined || !session || !sourceUrl) {
        await ctx.answerCallbackQuery({
            text: "Session expired",
            show_alert: true,
        });
        return;
    }
    const media = session.formats.find((f) => f.id === id);
    if (!media) {
        await ctx.answerCallbackQuery();
        return;
    }
    const height = media.height || media.quality || "720";
    const statusMessageId = ctx.callbackQuery.message.message_id;
    const caption = `<b>${session.caption || ""}</b>`;
    await ctx.answerCallbackQuery();
    await ctx.api.editMessageText(chatId, statusMessageId, "⬇️ Downloading video...");
    runInBackground(async () => {
        let filePath;
        try {
            filePath = await downloadVideo(sourceUrl, media.id, height);
        }
        catch (err) {
            console.error(err);
            await ctx.api.editMessageText(chatId, statusMessageId, "❌ Failed to download video");
            return;
        }
        try {
            const sizeMB = fs.statSync(filePath).size / (1024 * 1024);
            if (sizeMB > 45) {
                // Large video → send as document (no processing)
                await ctx.api.sendDocument(chatId, new InputFile(filePath), {
                    caption,
                    parse_mode: "HTML",
                });
            }
            else {
                await ctx.api.sendVideo(chatId, new InputFile(filePath), {
                    caption,
                    parse_mode: "HTML",
                    supports_streaming: true,
                });
            }
            await ctx.api.deleteMessage(chatId, statusMessageId);
        }
        catch (err) {
            console.error(err);
            await ctx.api.sendMessage(chatId, "❌ Failed to upload media");
        }
        finally {
            try {
                fs.unlinkSync(filePath);
                console.log("🧹 Deleted:", filePath);
            }
            catch (err) {
                console.error("Failed to delete file:", err);
            }
        }
    });
});
await initYtDlp();
const server = fastify();
server.post(`/${bot.token}`, webhookCallback(bot, "fastify"));
server.listen({ port: 3001 });
