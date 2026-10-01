export type MediaType = "video" | "photo";
export interface MediaFormat {
    id: string;
    quality: string;
    type: MediaType;
}
export interface ExtractedMedia {
    caption: string;
    formats: MediaFormat[];
}
export declare function extractMedia(url: string): Promise<ExtractedMedia>;
export declare function downloadVideo(url: string, videoId: string, height: string): Promise<string>;
export declare function downloadImage(sourceUrl: string): Promise<string>;
//# sourceMappingURL=extract.d.ts.map