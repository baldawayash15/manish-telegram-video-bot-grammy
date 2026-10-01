import { getGuestToken } from "./xapi.js";

const GRAPHQL_URL =
  "https://api.x.com/graphql/2ICDjqPd81tulZcYrtpTuQ/TweetResultByRestId";

export async function getTweetCaption(tweetId: string): Promise<string> {
  const guestToken = await getGuestToken();

  console.log("XAPI GUEST TOKEN RESPONSE:", JSON.stringify(guestToken));

  const variables = {
    tweetId: tweetId,
    includePromotedContent: false,
    withCommunity: false,
    withBirdwatchNotes: false,
    withVoice: false,
  };

  const features = {
    creator_subscriptions_tweet_preview_api_enabled: true,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    view_counts_everywhere_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
      true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    responsive_web_media_download_video_enabled: false,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  };

  const fieldToggles = {
    withArticleRichContentState: false,
  };

  const res = await fetch(
    `${GRAPHQL_URL}?variables=${encodeURIComponent(
      JSON.stringify(variables)
    )}&features=${encodeURIComponent(
      JSON.stringify(features)
    )}&fieldToggles=${encodeURIComponent(JSON.stringify(fieldToggles))}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
        "x-guest-token": guestToken,
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch tweet data");
  }

  const json = (await res.json()) as TweetResultResponse;

  // console.log("XAPI RESPONSE:", JSON.stringify(json, null, 2));

  const noteText =
    json?.data?.tweetResult?.result?.note_tweet?.note_tweet_results?.result
      ?.text;

  if (noteText) {
    return noteText;
  }

  return (
    removeTwitterShortLinks(
      json?.data?.tweetResult?.result?.legacy?.full_text
    ) ||
    removeTwitterShortLinks(json?.data?.tweetResult?.result?.legacy?.text) ||
    ""
  );
}

// Only the fields read above from the TweetResultByRestId response.
interface TweetResultResponse {
  data?: {
    tweetResult?: {
      result?: {
        note_tweet?: { note_tweet_results?: { result?: { text?: string } } };
        legacy?: { full_text?: string; text?: string };
      };
    };
  };
}

function removeTwitterShortLinks(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/https?:\/\/t\.co\/\w+/g, "").trim();
}
