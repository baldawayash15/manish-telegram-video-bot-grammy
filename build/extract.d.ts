import type { ExtractedMedia } from "./types.js";
export declare function extractMedia(url: string): Promise<ExtractedMedia>;
export declare function downloadVideo(url: string, videoId: string, height: string): Promise<string>;
export declare function downloadImage(sourceUrl: string): Promise<string>;
//# sourceMappingURL=extract.d.ts.map