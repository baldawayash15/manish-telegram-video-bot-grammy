import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getTweetCaption } from "./twitter/getTweet.js";
import { extractTweetId } from "./twitter/utils.js";
import { ytdlp } from "./ytdlp.js";
const execAsync = promisify(exec);
console.log("getTweetCaption ref:", getTweetCaption);
/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */
function isTwitter(url) {
    return /twitter\.com|x\.com/.test(url);
}
function isInstagram(url) {
    return /instagram\.com/.test(url);
}
function uniqByQuality(formats) {
    const seen = new Set();
    return formats.filter((f) => {
        if (seen.has(f.quality))
            return false;
        seen.add(f.quality);
        return true;
    });
}
/* -------------------------------------------------- */
/* Media Extraction                                   */
/* -------------------------------------------------- */
export async function extractMedia(url) {
    // const { stdout } = await execAsync(`yt-dlp --dump-json "${url}"`);
    const info = (await ytdlp.getInfoAsync(url));
    // const info = JSON.parse(stdout);
    let caption = info.description || "";
    // let caption: any;
    /* ---------- TWITTER CAPTION (note_tweet) ---------- */
    if (isTwitter(url)) {
        const tweetId = extractTweetId(url);
        if (tweetId) {
            try {
                caption = await getTweetCaption(tweetId);
            }
            catch {
                // fallback already set
            }
        }
    }
    /* ---------- FORMATS ---------- */
    const formats = [];
    if (info.formats?.length) {
        for (const f of info.formats) {
            if (!f.format_id)
                continue;
            if (!f.vcodec || f.vcodec === "none")
                continue;
            formats.push({
                id: f.format_id,
                quality: f.height ? `${f.height}p` : f.format_note || "video",
                type: "video",
            });
        }
    }
    /* ---------- INSTAGRAM PHOTOS ---------- */
    if (isInstagram(url) && info.entries?.length) {
        for (const entry of info.entries) {
            if (entry.ext === "jpg" || entry.ext === "png") {
                formats.push({
                    id: entry.id,
                    quality: "Image",
                    type: "photo",
                });
            }
        }
    }
    return {
        caption: caption || "",
        formats: uniqByQuality(formats),
    };
}
/* -------------------------------------------------- */
/* Download Video (merged audio)                       */
/* -------------------------------------------------- */
export async function downloadVideo(url, videoId, height) {
    const dir = path.resolve("downloads");
    const fileName = crypto.randomUUID() + ".mp4";
    const outPath = path.resolve(dir, fileName);
    if (!fs.existsSync("downloads"))
        fs.mkdirSync("downloads");
    // const filePath = path.join(dir, `${fileName}.mp4`);
    const filePath = outPath;
    await ytdlp.downloadAsync(url, {
        output: filePath,
        format: `${videoId}+bestaudio/best`,
        mergeOutputFormat: "mp4",
    });
    if (!fs.existsSync(filePath)) {
        throw new Error(`Video download failed: ${filePath}`);
    }
    return filePath;
}
/*export async function downloadVideo(
  sourceUrl: string,
  formatId: string
): Promise<string> {
  const fileName = crypto.randomUUID() + ".mp4";
  const outPath = path.resolve("downloads", fileName);

  if (!fs.existsSync("downloads")) {
    fs.mkdirSync("downloads");
  }

  const cmd = [
    "yt-dlp",
    `"${sourceUrl}"`,
    "-f",
    `"${formatId}+bestaudio/best"`,
    "--merge-output-format",
    "mp4",
    "-o",
    `"${outPath}"`,
  ].join(" ");

  await execAsync(cmd);
  return outPath;
}*/
/* -------------------------------------------------- */
/* Download Image                                     */
/* -------------------------------------------------- */
export async function downloadImage(sourceUrl) {
    const fileName = crypto.randomUUID() + ".jpg";
    const outPath = path.resolve("downloads", fileName);
    if (!fs.existsSync("downloads")) {
        fs.mkdirSync("downloads");
    }
    const cmd = ["yt-dlp", `"${sourceUrl}"`, "-o", `"${outPath}"`].join(" ");
    await execAsync(cmd);
    return outPath;
}
