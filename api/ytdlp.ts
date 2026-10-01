import { YtDlp, helpers } from "ytdlp-nodejs";
import { spawnSync } from "node:child_process";

// `let` so initYtDlp can recreate it: YtDlp only looks for the bundled ffmpeg in its constructor.
export let ytdlp = new YtDlp();

function hasSystemFFmpeg(): boolean {
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
}

// ffmpeg is required to merge the separate video+audio streams in downloadVideo.
// Uses the package's bundled ffmpeg, else one on PATH (yt-dlp finds it itself),
// else downloads the bundled one.
export async function initYtDlp() {
  console.log("🔍 Checking yt-dlp installation...");

  if (!ytdlp.checkInstallation()) {
    throw new Error("yt-dlp binary not found or not runnable");
  }

  if (!helpers.findFFmpegBinary() && !hasSystemFFmpeg()) {
    console.log("⬇️ ffmpeg not found, downloading...");
    await ytdlp.downloadFFmpeg();
    ytdlp = new YtDlp();
  }

  console.log("✅ yt-dlp & ffmpeg ready");
}
