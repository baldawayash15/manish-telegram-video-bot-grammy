import { YtDlp } from "ytdlp-nodejs";
export const ytdlp = new YtDlp();
async function downloadFFmpeg() {
    await ytdlp.downloadFFmpeg();
}
export async function initYtDlp() {
    console.log("🔍 Checking yt-dlp installation...");
    const isInstalled = await ytdlp.checkInstallation({
        ffmpeg: true,
    });
    if (isInstalled) {
        console.log("✅ yt-dlp & ffmpeg ready");
    }
    else {
        downloadFFmpeg();
        console.log("❌ yt-dlp & ffmpeg not ready");
    }
}
