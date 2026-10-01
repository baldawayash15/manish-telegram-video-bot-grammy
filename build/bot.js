import { Bot, InlineKeyboard, session, InputFile, webhookCallback, } from "grammy";
import { extractMedia } from "./extract.js";
import dotenv from "dotenv";
import fs from "node:fs";
import { downloadVideo } from "./extract.js";
import { fastify } from "fastify";
dotenv.config();
const bot = new Bot(process.env.BOT_TOKEN);
// Session middleware
bot.use(session({
    initial: () => ({}),
}));
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
    const status = await ctx.reply("🔍 Fetching media...");
    console.log("FETCH TYPE:", typeof fetch);
    try {
        const data = await extractMedia(url);
        if (!data.formats.length) {
            await ctx.api.editMessageText(status.chat.id, status.message_id, "❌ No downloadable media found");
            return;
        }
        ctx.session.media = data;
        ctx.session.mediaSourceUrl = url;
        const kb = new InlineKeyboard();
        for (const f of data.formats) {
            kb.text(`🎬 ${f.quality}`, `q|${f.id}`).row();
        }
        await ctx.api.editMessageText(status.chat.id, status.message_id, "Select quality:", {
            parse_mode: "Markdown",
            reply_markup: kb,
        });
    }
    catch (err) {
        console.error(err);
        await ctx.api.editMessageText(status.chat.id, status.message_id, "❌ Failed to extract media");
    }
});
// Handle quality selection
bot.callbackQuery(/^q\|/, async (ctx) => {
    const id = ctx.callbackQuery.data.split("|")[1];
    const session = ctx.session.media;
    if (!session) {
        await ctx.answerCallbackQuery({
            text: "Session expired",
            show_alert: true,
        });
        return;
    }
    const media = session.formats.find((f) => f.id === id);
    if (!media)
        return;
    const height = media.height || media.quality || "720";
    const chatId = ctx.chat.id;
    const statusMessageId = ctx.callbackQuery.message.message_id;
    await ctx.api.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, "⬇️ Downloading video...");
    // IMPORTANT: original source URL, NOT format URL
    const sourceUrl = ctx.session.mediaSourceUrl;
    const filePath = await downloadVideo(sourceUrl, media.id, height);
    const sizeMB = fs.statSync(filePath).size / (1024 * 1024);
    const caption = `<b>${session.caption || ""}</b>`;
    try {
        if (sizeMB > 45) {
            // ✅ Large video → send as document (NO processing)
            await ctx.replyWithDocument(new InputFile(filePath), {
                caption,
                parse_mode: "HTML",
            });
        }
        else {
            await ctx.replyWithVideo(new InputFile(filePath), {
                caption,
                parse_mode: "HTML",
                supports_streaming: true,
            });
        }
        await ctx.api.deleteMessage(chatId, statusMessageId);
    }
    catch (err) {
        console.error(err);
        await ctx.reply("❌ Failed to upload media");
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
    // await ctx.replyWithVideo(new InputFile(fs.createReadStream(filePath)), {
    //   caption: `<b>${session.caption || ""}</b>`,
    //   parse_mode: "HTML",
    // });
    // ✅ REMOVE "Downloading..." message
    // fs.unlinkSync(filePath);
});
const server = fastify();
server.post(`/${bot.token}`, webhookCallback(bot, "fastify"));
server.listen({ port: 3001 });
//  export default webhookCallback(bot, "https");
