type CaptionInput = {
  eventTitle?: string | null;
  eventType?: string | null;
  caption?: string | null;
  locationName?: string | null;
};

type RecapInput = {
  eventTitle: string;
  eventType?: string | null;
  guestCount?: number;
  mediaCount?: number;
  guestbookSnippets?: string[];
  highlightCaptions?: string[];
};

async function openAiChat(
  system: string,
  user: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

function heuristicCaption(input: CaptionInput): string {
  const title = input.eventTitle?.trim() || "the celebration";
  const place = input.locationName?.trim();
  const existing = input.caption?.trim();
  if (existing) {
    return existing.length > 120 ? `${existing.slice(0, 117)}…` : existing;
  }
  if (place) return `A moment from ${title} at ${place}.`;
  const type = input.eventType?.replace(/_/g, " ") || "event";
  return `Captured at ${title} — a ${type} memory worth keeping.`;
}

export async function generateAiCaption(input: CaptionInput): Promise<string> {
  const prompt = [
    `Event: ${input.eventTitle || "Untitled event"}`,
    input.eventType ? `Type: ${input.eventType}` : "",
    input.locationName ? `Location: ${input.locationName}` : "",
    input.caption ? `Existing caption: ${input.caption}` : "",
    "Write one short, warm photo caption (max 20 words). No hashtags.",
  ]
    .filter(Boolean)
    .join("\n");

  const ai = await openAiChat(
    "You write concise, heartfelt event photo captions.",
    prompt,
  );
  return ai || heuristicCaption(input);
}

function heuristicRecap(input: RecapInput): string {
  const guests = input.guestCount ?? 0;
  const media = input.mediaCount ?? 0;
  const snippets = (input.guestbookSnippets || [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const highlights = (input.highlightCaptions || [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const parts = [
    `${input.eventTitle} brought people together${
      input.eventType ? ` for a ${input.eventType.replace(/_/g, " ")}` : ""
    }.`,
    guests || media
      ? `Guests shared ${media} memories${
          guests ? ` across ${guests} ${guests === 1 ? "guest" : "guests"}` : ""
        }.`
      : "The gallery captured the night as it happened.",
  ];

  if (highlights.length) {
    parts.push(`Standout moments: ${highlights.join("; ")}.`);
  }
  if (snippets.length) {
    parts.push(`From the guestbook: “${snippets.join("” · “")}”.`);
  }
  parts.push("Thanks for making these memories together.");
  return parts.join(" ");
}

export async function generateEventRecap(input: RecapInput): Promise<string> {
  const prompt = JSON.stringify({
    title: input.eventTitle,
    eventType: input.eventType,
    guestCount: input.guestCount,
    mediaCount: input.mediaCount,
    guestbookSnippets: input.guestbookSnippets?.slice(0, 8),
    highlightCaptions: input.highlightCaptions?.slice(0, 8),
  });

  const ai = await openAiChat(
    "You write warm 2–4 sentence post-event recaps for a shared photo gallery. No markdown.",
    `Write a recap from this event data:\n${prompt}`,
  );
  return ai || heuristicRecap(input);
}

export async function askAboutEvent(input: {
  question: string;
  eventTitle: string;
  eventType?: string | null;
  locationName?: string | null;
  startAt?: string | null;
  guestCount?: number;
  mediaCount?: number;
  scheduleSummary?: string | null;
  recapSummary?: string | null;
}): Promise<string> {
  const context = [
    `Title: ${input.eventTitle}`,
    input.eventType ? `Type: ${input.eventType}` : "",
    input.locationName ? `Location: ${input.locationName}` : "",
    input.startAt ? `Starts: ${input.startAt}` : "",
    input.guestCount != null ? `Guests: ${input.guestCount}` : "",
    input.mediaCount != null ? `Media: ${input.mediaCount}` : "",
    input.scheduleSummary ? `Schedule: ${input.scheduleSummary}` : "",
    input.recapSummary ? `Recap: ${input.recapSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ai = await openAiChat(
    "You answer short questions about a single private event using only the provided context. If unknown, say you do not have that detail yet.",
    `Context:\n${context}\n\nQuestion: ${input.question}`,
  );

  if (ai) return ai;

  const q = input.question.toLowerCase();
  if (q.includes("where") && input.locationName) {
    return `${input.eventTitle} is at ${input.locationName}.`;
  }
  if ((q.includes("when") || q.includes("start")) && input.startAt) {
    return `${input.eventTitle} starts ${input.startAt}.`;
  }
  if (q.includes("how many") && q.includes("guest") && input.guestCount != null) {
    return `${input.eventTitle} currently has ${input.guestCount} guests.`;
  }
  if (q.includes("photo") || q.includes("media")) {
    return input.mediaCount != null
      ? `There are ${input.mediaCount} photos and videos in ${input.eventTitle}.`
      : `Open the gallery for ${input.eventTitle} to browse the latest uploads.`;
  }
  if (input.recapSummary) return input.recapSummary;
  return `I don't have enough detail yet about “${input.question.trim()}” for ${input.eventTitle}.`;
}
