type JsonProps = {
  guest_token: string;
};

export async function getGuestToken(): Promise<string> {
  console.log("REQUESTING GUEST TOKEN");
  const res = await fetch("https://api.x.com/1.1/guest/activate.json", {
    method: "POST",
    headers: {
      Authorization:
        `Bearer ${process.env.X_BEARER_TOKEN} `,
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Guest token fetch failed:", res.status, text);
    throw new Error(`Failed to fetch guest token: ${res.status}`);
  }

  console.log("TOKEN STATUS:", res.status);

  const json = (await res.json()) as JsonProps;
  return json.guest_token;
}
