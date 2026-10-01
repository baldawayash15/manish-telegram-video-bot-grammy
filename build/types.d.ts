export type MediaType = "video" | "photo";
export interface MediaFormat {
    id: string;
    quality: string;
    url: string;
    type: MediaType;
    height: string;
}
export interface ExtractedMedia {
    caption: string;
    formats: MediaFormat[];
}
export interface SessionData {
    media?: ExtractedMedia;
    mediaSourceUrl?: string;
}
//# sourceMappingURL=types.d.ts.map