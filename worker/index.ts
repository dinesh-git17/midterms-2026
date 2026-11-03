/**
 * Serves the built page and a small caching proxy in front of civicAPI.
 *
 * Every visitor polls this Worker, not civicAPI, so the free API sees at most one
 * request per race per FRESH_SECONDS per Cloudflare location, however many people
 * have the page open. Responses are checked before they are cached, and when civicAPI
 * sends something unusable (it sometimes answers 200 with an empty body) the last good
 * copy is served instead, marked with `x-stale: 1`.
 *
 *   GET /api/race/:id         one race, trimmed to the fields the page uses
 *   GET /api/closings/:id     { "ga": "2026-11-04T00:00:00.000Z", ... } for a summary race
 */

const UPSTREAM = "https://civicapi.org/api/v2/race/";
const FRESH_SECONDS = 20;
const STALE_SECONDS = 60 * 60 * 24 * 3;
const CLOSINGS_SECONDS = 60 * 60;
// Only the Senate and governor summaries: each has under 40 races, which keeps one
// closings build under the Workers subrequest limit.
const CLOSING_SUMMARIES = new Set(["87528", "87535"]);

type Json = Record<string, unknown>;

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);

    const race = url.pathname.match(/^\/api\/race\/(\d{1,9})$/);
    if (race) return raceResponse(race[1], ctx);

    const closings = url.pathname.match(/^\/api\/closings\/(\d{1,9})$/);
    if (closings && CLOSING_SUMMARIES.has(closings[1])) return closingsResponse(closings[1], ctx);

    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler;

async function raceResponse(id: string, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default;
  const freshKey = new Request(`https://cache.internal/fresh/race/${id}`);
  const staleKey = new Request(`https://cache.internal/stale/race/${id}`);

  const hit = await cache.match(freshKey);
  if (hit) return withHeaders(hit, { "x-cache": "hit" });

  const body = await fetchRace(id);
  if (body) {
    const text = JSON.stringify(body);
    ctx.waitUntil(
      Promise.all([
        cache.put(freshKey, cacheable(text, FRESH_SECONDS)),
        cache.put(staleKey, cacheable(text, STALE_SECONDS)),
      ]),
    );
    return clientResponse(text, { "x-cache": "miss" });
  }

  const stale = await cache.match(staleKey);
  if (stale) return clientResponse(await stale.text(), { "x-cache": "stale", "x-stale": "1" });
  return json({ error: "civicAPI did not return usable data" }, 502);
}

async function closingsResponse(id: string, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default;
  const key = new Request(`https://cache.internal/closings/${id}`);
  const hit = await cache.match(key);
  if (hit) return withHeaders(hit, { "x-cache": "hit" });

  const summary = await fetchRace(id);
  const regions = (summary?.region_results ?? {}) as Record<string, Json>;
  const entries = await Promise.all(
    Object.entries(regions).map(async ([state, region]) => {
      const race = await fetchRace(String(region.election_id));
      return [state, typeof race?.polls_close === "string" ? race.polls_close : null] as const;
    }),
  );
  const closings = Object.fromEntries(entries.filter(([, at]) => at));
  const text = JSON.stringify(closings);
  // Only cache a mostly complete answer, so one bad minute upstream is not kept for an hour.
  if (entries.length > 0 && Object.keys(closings).length >= entries.length * 0.8) {
    ctx.waitUntil(cache.put(key, cacheable(text, CLOSINGS_SECONDS)));
  }
  return clientResponse(text, { "x-cache": "miss" });
}

/** Fetches one race and trims it, or returns null when the answer is unusable. */
async function fetchRace(id: string): Promise<Json | null> {
  try {
    const res = await fetch(UPSTREAM + id, {
      headers: { accept: "application/json", "user-agent": "midterms.dins.dev (cached proxy)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text) as Json;
    if (!Array.isArray(data.candidates)) return null;
    return trimRace(data);
  } catch {
    return null;
  }
}

export function trimRace(data: Json): Json {
  const regions = (data.region_results ?? {}) as Record<string, Json>;
  return {
    election_name: data.election_name,
    election_type: data.election_type,
    province: data.province,
    percent_reporting: data.percent_reporting,
    polls_close: data.polls_close ?? null,
    last_updated: data.last_updated,
    has_map: data.has_map,
    candidates: trimCandidates(data.candidates),
    region_results: Object.fromEntries(
      Object.entries(regions).map(([key, region]) => [
        key,
        {
          name: region.name,
          type: region.type,
          election_id: region.election_id,
          percent_reporting: region.percent_reporting,
          candidates: trimCandidates(region.candidates),
        },
      ]),
    ),
  };
}

function trimCandidates(list: unknown): Json[] {
  if (!Array.isArray(list)) return [];
  return list.map((c: Json) => ({
    name: c.name,
    party: c.party,
    votes: c.votes ?? 0,
    percent: c.percent ?? 0,
    winner: Boolean(c.winner),
    advanced: Boolean(c.advanced),
    incumbent: Boolean(c.incumbent),
    ...(typeof c.seats === "number" ? { seats: c.seats } : {}),
  }));
}

function cacheable(text: string, seconds: number): Response {
  return new Response(text, {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${seconds}` },
  });
}

function clientResponse(text: string, extra: Record<string, string>): Response {
  return new Response(text, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=10",
      ...extra,
    },
  });
}

function withHeaders(res: Response, extra: Record<string, string>): Response {
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "public, max-age=10");
  for (const [k, v] of Object.entries(extra)) out.headers.set(k, v);
  return out;
}

function json(body: Json, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
