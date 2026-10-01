export function extractTweetId(url) {
    const match = url.match(/status\/(\d+)/);
    return match?.[1] ?? null;
}
