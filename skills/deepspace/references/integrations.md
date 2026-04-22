# DeepSpace Integrations Reference

All integrations are called through the api-worker proxy:

```typescript
import { integration } from 'deepspace'
const result = await integration.post('<integration-name>/<endpoint-name>', { ...params })
// Returns: { success: true, data: ... } or { success: false, error: "..." }
```

**Endpoint keys are two segments: `<integration>/<endpoint>`.** Use the exact names below — do not invent or paraphrase.

**Body shapes** — each entry lists the minimum required body (the one field you can't omit) and the most common optional fields. For full optional-parameter coverage (enum values, ranges, defaults) the api-worker's Zod schema is the source of truth — but a wrong body just returns `{ success: false, error: "..." }` in the envelope, so the fast path is: try the required shape below, then widen with optionals as needed. Realistic example values are shown; the endpoint doesn't care what you pass as long as the type matches.

## Billing & access control

The scaffold's `src/integrations.ts` defaults every integration to `billing: 'developer'` — the app owner pays. This is intentional: end-users of a deployed app shouldn't have to create a DeepSpace account or hand over a card just to use features that hit external APIs. The trade-off is that the integration proxy also lets **anonymous callers** through for `developer`-billed endpoints, so without a UI gate any visitor (or a bot finding the deployed URL) can fire `integration.post(...)` and the owner pays.

**Default rule: auth-gate any UI surface that triggers `integration.post(...)`.** Wrap the calling page or button behind `useAuth().isSignedIn` (see SKILL.md Step 4). The owner still pays — that's the model — but the surface is limited to signed-in users you can identify, count, and rate-limit per your app's own logic. Anonymous bots are stopped at the sign-in wall.

**Alternative for explicit user-pays apps: `billing: 'user'`.** If callers (not the owner) should pay, flip the integration in `src/integrations.ts`:
```ts
export const integrations: Record<string, { billing: 'developer' | 'user' }> = {
  google: { billing: 'user' },   // already in scaffold — required for OAuth
  // openai: { billing: 'user' },
}
```
The api-worker then 401s anonymous callers and bills the signed-in user's DeepSpace credits. This is enforced server-side, so it holds even if the UI gate is bypassed — but it does require every end-user to have a DeepSpace account with credits, which is usually only appropriate when each user has an obvious one-to-one relationship with their own costs (and you've told them so up front).

**Note for `google/*`**: keep `'user'`. OAuth tokens are stored per-user keyed by JWT subject — using `developer` would forward the owner's JWT and operate on the owner's connected Gmail/Drive/Calendar regardless of who's signed in client-side.

**Integration calls cost real money every test run.** `npx deepspace test` and `api.spec.ts` runs hit the real third-party API through the proxy — `developer`-billed calls charge the CLI user (`npx deepspace whoami`), `user`-billed calls charge the signed-in test account. Keep integration assertions minimal: one `integration.post(...)` per endpoint per test run, not a matrix. Never put integration calls inside `for` loops, retry-until-success polls, or parameterized test generators.

**Skip real `user`-billed endpoint calls in api.spec.ts.** Test accounts have no DeepSpace credits, so `user`-billed calls (e.g. `google/*`, or anything you've flipped to `'user'`) will 402 and the test will fail for the wrong reason. Don't "fix" this by temporarily flipping the integration to `'developer'` for tests — that silently bills the CLI user for calls the real app would have charged its end-users for, which is the opposite of what the developer chose.

**For the OAuth surface (Google), use `page.route(...)` to mock the connected and recovery branches.** The disconnected state is the easy half — fresh test accounts always show "Connect" so smoke.spec.ts can assert that with no mocks. But the connected-state UI (Disconnect button, events/data list, send-action affordances) and the requiresOAuth recovery prompt are non-trivial branches that fail silently in production if you don't exercise them. Minimum coverage:

```typescript
// 1. connected state renders Disconnect + data UI
await page.route('**/api/integrations/status', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ google: { connected: true, calendar: true, gmailSend: true } }),
  })
)
await page.route('**/api/integrations/google/calendar-list-events', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { items: [{ id: 'e1', summary: 'mock event', attendees: [{ email: 'a@x.com' }] }] } }),
  })
)
// → assert Disconnect button visible, mock event renders, Send button enabled

// 2. requiresOAuth recovery — note the nested `data` envelope
await page.route('**/api/integrations/google/gmail-send', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { requiresOAuth: true, provider: 'google', scopes: ['gmail.send'], authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...' } }),
  })
)
// → assert reconnect prompt appears, page does NOT crash, no infinite retry loop

// 3. Disconnect button hits the right endpoint
let disconnectCalled = false
await page.route('**/api/integrations/oauth/google/disconnect', (route) => {
  disconnectCalled = true
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
})
// → click Disconnect, assert disconnectCalled === true, banner flips back
```

Real Google round-trips remain **deploy-and-manual-test only** — note that explicitly in `findings.md` so the gap is paper-trailed instead of forgotten.

## AI / LLM

### anthropic
- `anthropic/chat-completion` — body: `{ messages: [{ role: 'user', content: 'Hello' }] }`. Optional: `model` (default `'claude-sonnet-4-20250514'`), `max_tokens` (default 4096), `system`, `temperature` (0–1). Content can be a string or a structured array.

### openai
- `openai/chat-completion` — body: `{ messages: [{ role: 'user', content: 'Hello' }] }`. Optional: `model` (default `'gpt-4o'`), `max_tokens` (1–16384, default 100), `temperature` (0–2). Supports `user | system | assistant` roles.
- `openai/generate-image` — body: `{ prompt: 'A sunset over mountains' }`. Optional: `model` (`'gpt-image-1' | 'gpt-image-1-mini'`), `n` (1–4), `size` (`'1024x1024' | '1536x1024' | '1024x1536' | 'auto'`), `quality` (`'low' | 'medium' | 'high' | 'auto'`). Returns base64 images.

### gemini
- `gemini/generate-image` — body: `{ prompt: 'A sunset' }`. Optional: `model` (default `'gemini-2.5-flash-image'`), `aspectRatio`, `imageSize`, `temperature` (0–2), `maxOutputTokens`. Returns `base64Images` array + `text`.

## Search / Web

### exa
- `exa/search` — body: `{ query: 'climate change' }` (also accepts `q`). Optional: `numResults` (1–100, default 10), `type`, `category`, `includeDomains`, `excludeDomains`, `startPublishedDate`, `endPublishedDate`, `contents` (config for text/highlights/summary).
- `exa/answer` — body: `{ query: 'What is photosynthesis?' }` (also accepts `q`). Optional: `text` (bool). Direct Q&A with citations.
- `exa/findSimilar` — body: `{ url: 'https://example.com' }`. Optional: same filter/content options as `exa/search`.
- `exa/contents` — body: `{ urls: ['https://example.com'] }` (non-empty array). Optional: `text`, `highlights`, `summary`, `subpages`, `extras`, `context`.
- `exa/news-search` — body: `{ q: 'Bitcoin' }` (also accepts `query`). Optional: `numResults`, `country`, `includeDomains`, `excludeDomains`, `from`, `to`.
- `exa/research` — body: `{ instructions: 'Research recent trends in AI safety' }` (max 4096 chars). Optional: `model` (default `'exa-research'`), `outputSchema`. Async — polls up to 60× at 10s intervals.

### firecrawl
- `firecrawl/scrape` — body: `{ url: 'https://example.com' }`. Optional: `formats` (default `['markdown']`), `onlyMainContent` (default `true`), `includeTags`, `excludeTags`, `waitFor`, `timeout`.
- `firecrawl/crawl` — body: `{ url: 'https://example.com' }`. Optional: `limit` (default 10), `maxDepth`, `includePaths`, `excludePaths`, `formats`. Async — polls up to 180×.
- `firecrawl/map` — body: `{ url: 'https://example.com' }`. Optional: `search`, `ignoreSitemap`, `sitemapOnly`, `includeSubdomains`, `limit`.
- `firecrawl/search` — body: `{ query: 'AI news' }`. Optional: `limit` (default 5), `lang`, `country`, `scrapeOptions`.

### serpapi
All `serpapi/*` endpoints are near-passthroughs to SerpApi — the Zod schemas are `.passthrough()`-style. The params below are the most common; any other SerpApi-supported param is forwarded.
- `serpapi/search` — body: `{ q: 'apple' }`. Optional: `engine` (default `'google'`), `num`, `location`.
- `serpapi/web-search` — body: `{ q: 'apple' }`. Optional: `num`, `start`, `location`, `gl`, `hl`.
- `serpapi/events` — body: `{ q: 'concerts in Brooklyn' }`. Optional: `location`, `hl`.
- `serpapi/flights` — body: `{ departure_id: 'JFK', arrival_id: 'LAX', outbound_date: '2025-06-01' }`. Optional: `return_date`, `type`, `adults`, `currency`, `hl`.
- `serpapi/hotels` — body: `{ q: 'Paris hotels', check_in_date: '2025-06-01', check_out_date: '2025-06-05' }`. Optional: `adults`, `location`, `gl`, `hl`.
- `serpapi/places-search` — body: `{ q: 'coffee shops', ll: '@40.7128,-74.0060,14z' }`. Optional: `type`, `hl`.
- `serpapi/places-reviews` — body: `{ data_id: '...' }` or `{ place_id: '...' }`. Optional: `hl`.
- `scholar/search-papers` — body: `{ q: 'attention is all you need' }`. Optional: `num`, `start`, `hl`, `as_ylo`, `as_yhi`.
- `scholar/search-authors` — body: `{ mauthors: 'Yann LeCun' }`. Optional: `hl`, `after_author`.
- `scholar/get-author-details` — body: `{ author_id: 'xxx' }`. Optional: `hl`.
- `scholar/get-author-papers` — body: `{ author_id: 'xxx' }`. Optional: `num`, `start`, `sort`, `hl`.
- `scholar/get-citation-details` — body: `{ q: 'xxx' }`. Optional: `hl`.

### websearch
- `websearch/advanced-search` — body: `{ searchPrompt: 'climate change impacts' }`. Optional: `queryHints` (array), `searchType` (`'web' | 'images' | 'videos' | 'academic' | 'all'`, default `'all'`), `count` (1–10, default 5), `parseResultsPrompt`. AI-summarized results with citations.

### wikipedia
- `wikipedia/search-pages` — body: `{ query: 'Python programming' }` (also accepts `q`). Optional: `limit` (1–50, default 10).
- `wikipedia/get-page-summary` — body: `{ title: 'Python (programming language)' }`.
- `wikipedia/get-page-content` — body: `{ title: 'Python (programming language)' }`. Returns raw HTML.
- `wikipedia/get-random-page` — body: `{}`.

## Weather / Location

### openweathermap
- `openweathermap/geocoding` — body: `{ query: 'New York' }` (also accepts `q`). Optional: `limit` (1–10, default 5).
- `openweathermap/current` — body: `{ location: 'New York' }` (also accepts `q`). Optional: `units` (`'metric' | 'imperial' | 'standard'`, default `'metric'`).
- `openweathermap/forecast` — body: `{ location: 'New York' }` (also accepts `q`). Optional: `units`. Returns 5-day forecast; `data` is a flat array.

## News

### newsapi
- `newsapi/top-headlines` — body: `{}` (all optional). Optional: `country` (default `'us'`), `category`, `sources`, `q`, `pageSize` (1–100, default 20), `page` (default 1).
- `newsapi/search-everything` — body: `{ q: 'Bitcoin' }` (also accepts `query`). Optional: `sources`, `domains`, `excludeDomains`, `from`, `to`, `language` (default `'en'`), `sortBy` (default `'publishedAt'`), `pageSize`, `page`.

## Media — Images / Video

### freepik
Image-generation endpoints take the provider's own body shape (prompt + model-specific params). The api-worker passes the body through with minimal validation — consult the Freepik docs for per-model options.
- `freepik/text-to-image-classic` — body: `{ prompt: 'A sunset' }` + Freepik classic params. Synchronous.
- `freepik/generate-image-mystic` — body: `{ prompt: '...' }` + `resolution` (`'1k' | '2k' | '4k'`). Synchronous.
- `freepik/generate-image-flux-dev` — body: `{ prompt: '...' }`. Synchronous.
- `freepik/generate-image-flux-pro` — body: `{ prompt: '...' }`. Async polling.
- `freepik/generate-image-flux-2-pro` — body: `{ prompt: '...' }`. Async polling.
- `freepik/generate-image-flux-2-turbo` — body: `{ prompt: '...' }`. Async polling.
- `freepik/generate-image-hyperflux` — body: `{ prompt: '...' }`. Async polling.
- `freepik/generate-image-seedream` — body: `{ prompt: '...' }`. Async polling.
- `freepik/generate-image-seedream-v4` — body: `{ prompt: '...' }`. Async polling.
- `freepik/generate-image-seedream-v4-5` — body: `{ prompt: '...' }`. Async polling.
- `freepik/generate-image-z-image` — body: `{ prompt: '...' }`. Async polling.
- `freepik/generate-image-runway` — body: `{ prompt: '...' }`. Async polling.
- `freepik/image-expand` — body: `{ image: '<base64-or-url>' }` + expand params. Async polling.
- `freepik/image-relight` — body: `{ image: '<base64-or-url>' }` + relight params. Async polling.
- `freepik/image-style-transfer` — body: `{ image: '<base64-or-url>', reference_image: '<base64-or-url>' }`. Async polling.
- `freepik/upscale-image-precision` — body: `{ image: '<base64-or-url>' }` + `target_resolution` (`'1k-2k' | '2k-4k' | '4k-8k' | '5k-10k'`). Async polling.
- `freepik/remove-background` — body: `{ image: '<base64-or-url>' }` (form-urlencoded). Async polling.
- `freepik/generate-video` — body: provider-specific. Async polling (10s intervals); billed per second.
- `freepik/download-icons` — body: `{ id: 12345 }`.
- `freepik/download-stock-images` — body: `{ id: 12345 }`. Optional: `image_size`.
- `freepik/download-stock-videos` — body: `{ id: 12345 }`.

### submagic
- `submagic/create-video` — body: `{ title: 'My Video', language: 'en', videoUrl: 'https://...' }`. Optional: `templateName`, `userThemeId`, `dictionary`, `magicZooms`, `magicBrolls`, `magicBrollsPercentage` (0–100). Returns `projectId` for polling.
- `submagic/get-project` — body: `{ projectId: 'proj_123' }`. Check status / retrieve result.
- `submagic/wait-for-completion` — body: `{ projectId: 'proj_123' }`. Optional: `maxAttempts` (default 30), `pollInterval` (ms, default 10000).

### cloudconvert
- `cloudconvert/convert-file` — body: `{ input_format: 'pdf', output_format: 'docx' }` + either `file` (base64) or `url`. Async polling up to 60×.

## Audio / Speech

### elevenlabs
- `elevenlabs/list-voices` — body: `{}`.
- `elevenlabs/generate-speech` — body: `{ text: 'Hello world' }` (max 5000 chars). Optional: `voice_id` (default `'JBFqnCBsd6RMkjVDRZzb'`), `model_id` (`'eleven_v3' | 'eleven_multilingual_v2' | 'eleven_flash_v2_5' | ...`), `output_format` (mp3 or pcm variants), `voice_settings` (`stability`, `similarity_boost`, `style`, `use_speaker_boost`).
- `elevenlabs/create-agent` — body: `{ name: 'Support Agent', prompt: 'You are...', firstMessage: 'Hi!' }`. Optional: `voiceId`, `language` (default `'en'`), `llm` (default `'gemini-2.0-flash-001'`), `model`, `clientTools`.
- `elevenlabs/get-signed-url` — body: `{ agent_id: 'agent_123' }`. Returns WS signed URL.

### speech
- `speech/text-to-speech` — body: `{ input: 'Hello' }` (also accepts `text`; max 4096 chars). Optional: `model` (`'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts'`), `voice` (`'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer' | 'verse'`), `response_format` (`'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'`), `speed` (0.25–4.0).
- `speech/speech-to-text` — body: `{ audio: 'data:audio/wav;base64,...' }`. Optional: `model` (`'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe'`), `language` (ISO-639-1), `prompt`, `response_format` (`'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'`), `temperature` (0–1).

## Communication

### email
- `email/send` — body: `{ from: 'you@example.com', to: 'them@example.com', subject: 'Hi' }` + either `html` or `text`. Optional: `reply_to`, `cc`, `bcc` (string or array). Uses Resend.

### slack
Pass a workspace bot/user `accessToken` in every request body — there is no OAuth callback flow from the SDK side; obtain the token out of band.
- `slack/list-channels` — body: `{ accessToken: 'xoxb-...' }`. Optional: `limit` (1–200), `types` (default `'public_channel,private_channel'`), `cursor`.
- `slack/send-message` — body: `{ accessToken: 'xoxb-...', channel: 'C123456', text: 'Hello' }`. Optional: `thread_ts`, `unfurl_links`, `unfurl_media`, `blocks`.
- `slack/channel-history` — body: `{ accessToken: 'xoxb-...', channel: 'C123456' }`. Optional: `limit`, `cursor`, `oldest`, `latest`.
- `slack/team-info` — body: `{ accessToken: 'xoxb-...' }`.

### livekit (real-time audio/video rooms)
- `livekit/generate-token` — body: `{ roomName: 'room-1' }`. Optional: `displayName` (defaults to userId), `ttlSeconds` (60–86400, default 3600). Free endpoint.
- `livekit/create-room` — body: `{ roomName: 'room-1' }`. Optional: `maxParticipants` (1–100, default 10), `durationMinutes` (1–1440, default 60), `metadata`. Billed per participant-minute.
- `livekit/list-rooms` — body: `{}`. Free endpoint.
- `livekit/delete-room` — body: `{ roomName: 'room-1' }`. Free endpoint.

## Google (OAuth required)

All `google/*` endpoints require the caller to have completed OAuth for the relevant scope — see the **OAuth** section at the bottom of this file for the `requiresOAuth` response shape and the retry pattern.

### gmail
- `google/gmail-send` — body: `{ to: 'user@example.com', subject: 'Hi', content: 'Hello' }`. Optional: `html`, `threadId`. Scope: `gmail.send`.
- `google/gmail-list` — body: `{}`. Optional: `maxResults`, `pageToken`, `labelIds` (string or array, default `'INBOX'`), `q`. Scope: `gmail.readonly`.
- `google/gmail-get` — body: `{ messageId: 'msg_123' }` (also accepts `id`). Optional: `format` (default `'full'`). Scope: `gmail.readonly`.
- `google/gmail-search` — body: `{ query: 'from:alice@example.com' }` (also accepts `q`). Optional: `maxResults` (default 20), `pageToken`. Scope: `gmail.readonly`.

### drive
- `google/drive-list` — body: `{}`. Optional: `pageSize` (1–1000, default 50), `q`, `pageToken`. Scope: `drive.file`.
- `google/drive-get` — body: `{ fileId: 'file_123' }`. Optional: `fields`. Scope: `drive.file`.

### calendar
- `google/calendar-list-events` — body: `{}`. Optional: `calendarId` (default `'primary'`), `timeMin`, `timeMax`, `maxResults` (1–2500), `q`. Scope: `calendar.events`.
- `google/calendar-create-event` — body: `{ start: '2025-06-01T10:00:00Z' }`. Optional: `calendarId`, `title` / `summary`, `end`, `allDay` (default `false`), `description`, `location`, `attendees` (array), `addVideoConferencing`. Scope: `calendar.events`.
- `google/calendar-delete-event` — body: `{ eventId: 'evt_123' }`. Optional: `calendarId`. Scope: `calendar.events`.

### contacts
- `google/contacts-list` — body: `{}`. Optional: `pageSize` (1–2000, default 1000), `personFields`, `pageToken`. Scope: `contacts.readonly`.

## Social

### github
Authenticated endpoints (`get-user`, `get-user-repos`) use the caller's stored GitHub token. Public endpoints don't need auth and take the target username/owner in the body.
- `github/get-user` — body: `{}`. Returns the authenticated user.
- `github/get-user-repos` — body: `{}`. Optional: `sort`, `per_page` (1–100), `page`.
- `github/get-public-user` — body: `{ username: 'torvalds' }`.
- `github/get-user-public-repos` — body: `{ username: 'torvalds' }`. Optional: `sort`, `per_page`.
- `github/get-repository` — body: `{ owner: 'torvalds', repo: 'linux' }`.
- `github/get-repository-contents` — body: `{ owner: 'torvalds', repo: 'linux' }`. Optional: `path` (default `''`), `ref`.
- `github/get-repository-readme` — body: `{ owner: 'torvalds', repo: 'linux' }`.
- `github/get-repository-tree` — body: `{ owner: 'torvalds', repo: 'linux' }`. Optional: `sha` (default `'HEAD'`), `recursive`.
- `github/get-repository-commits` — body: `{ owner: 'torvalds', repo: 'linux' }`. Optional: `sha`, `per_page`, `page`.
- `github/get-repository-contributors` — body: `{ owner: 'torvalds', repo: 'linux' }`. Optional: `per_page`.
- `github/get-repository-languages` — body: `{ owner: 'torvalds', repo: 'linux' }`.
- `github/get-repository-issues` — body: `{ owner: 'torvalds', repo: 'linux' }`. Optional: `state` (`'open' | 'closed' | 'all'`), `per_page`, `page`.
- `github/get-repository-pulls` — body: `{ owner: 'torvalds', repo: 'linux' }`. Optional: `state`, `per_page`.
- `github/get-pull-request` — body: `{ owner: 'torvalds', repo: 'linux', pull_number: 123 }`.
- `github/get-pull-request-files` — body: `{ owner: 'torvalds', repo: 'linux', pull_number: 123 }`.
- `github/get-pull-request-reviews` — body: `{ owner: 'torvalds', repo: 'linux', pull_number: 123 }`.
- `github/get-commit` — body: `{ owner: 'torvalds', repo: 'linux', sha: 'abc123' }`.
- `github/search-repositories` — body: `{ q: 'language:python stars:>10000' }`. Optional: `sort`, `order` (`'asc' | 'desc'`), `per_page`.

### linkedin
- `linkedin/search-profiles` — body: one or more of `{ name, company, title, education, location }`. Optional: `page` (default 1). Must include at least one search term.
- `linkedin/analyze-profile-url` — body: `{ profileUrl: 'https://linkedin.com/in/username' }`.

### instagram
- `instagram/extract-content` — body: `{ url: 'https://instagram.com/p/ABC123' }`. Supports `/p/`, `/reel/`, `/reels/`, `/tv/`. Returns caption, media type, thumbnail, timestamp, author.

### tiktok
- `tiktok/post-video` — body: `{ videoUrl: 'https://...', caption: 'Check this out!' }`. Optional: `privacyLevel` (default `'PUBLIC_TO_EVERYONE'`), `hashtags` (array), `scheduleTime` (ISO for future posting). Returns `postId`.
- `tiktok/user-info` — body: `{}`. Returns the authenticated user profile.
- `tiktok/get-scheduled-posts` — body: `{}`.
- `tiktok/cancel-scheduled-post` — body: `{ postId: 'post_123' }`.

### youtube
- `youtube/search-videos` — body: `{ q: 'machine learning' }`. Optional: `order`, `maxResults` (1–50), `regionCode`, `publishedAfter`, `publishedBefore`. Returns formatted views/duration + watch/embed URLs.
- `youtube/get-video-details` — body: `{ id: 'dQw4w9WgXcQ' }`. Returns snippet + statistics + contentDetails.
- `youtube/get-trending-videos` — body: `{}`. Optional: `regionCode`, `maxResults` (1–50, default 25).

## Finance

> **Empty-response footgun (read before using `finnhub/stock-price` or `alphavantage/search-symbols`):** these two endpoints return **200 OK** even when the upstream has no data for the query. Finnhub returns an all-zero quote object (`{ c: 0, d: 0, dp: 0, ... }`) for unknown/misspelled symbols; Alpha Vantage returns `{ bestMatches: [] }`. The envelope is `{ success: true }` — so the caller must explicitly check for the empty/zero state in addition to `success`.

### finance
- `finnhub/stock-price` — body: `{ symbol: 'AAPL' }`. Returns `{ c, d, dp, h, l, o, pc, t }` (current / change / change % / high / low / open / prev close / timestamp).
- `alphavantage/search-symbols` — body: `{ keywords: 'Tesla' }` (also accepts `q`). Returns `{ bestMatches: [...] }`.
- `coinbase/crypto-price` — body: `{ symbol: 'BTC' }` (also accepts `id`). Returns `{ amount, currency, base }`.
- `coinbase/search-crypto` — body: `{ query: 'ethereum' }` (optional; also accepts `q`; omit to list all). Returns array of crypto currencies.
- `coinbase/search-currencies` — body: `{ query: 'USD' }` (optional; also accepts `q`; omit to list all fiat).

### polymarket
Gamma (events/markets):
- `polymarket/events` — body: `{}`. Optional: `limit`, `offset`, `order`, `ascending`, `closed`, `tag`.
- `polymarket/event-detail` — body: `{ id: 'event_123' }`.
- `polymarket/markets` — body: `{}`. Optional: `limit`, `offset`, `order`, `ascending`, `closed`, `tag`, `event_slug`.
- `polymarket/market-detail` — body: `{ id: 'market_123' }`.
- `polymarket/tags` — body: `{}`.
- `polymarket/search` — body: `{ q: 'election' }`. Optional: `limit`.
- `polymarket/comments` — body: `{ market_id: 'market_123' }`. Optional: `limit`, `offset`.

CLOB (trading/prices):
- `polymarket/price` — body: `{ token_id: 'token_123' }`. Optional: `side`.
- `polymarket/prices` — body: `{ token_ids: ['token_1', 'token_2'] }` (array or string).
- `polymarket/orderbook` — body: `{ token_id: 'token_123' }`.
- `polymarket/price-history` — body: `{ token_id: 'token_123' }`. Optional: `interval`, `fidelity`, `startTs`, `endTs`.
- `polymarket/trades` — body: `{ token_id: 'token_123' }`. Optional: `limit`, `before`, `after`.

## Sports

The non-F1 sports integrations (`api-football`, `api-basketball`, `api-american-football`, `api-baseball`) are thin passthroughs to the API-Sports v1/v3 endpoints — every query param the upstream accepts is forwarded. Typical params: `league`, `season`, `team`, `date`, `fixture`, `id`. Consult the upstream API-Sports docs for per-endpoint required params; the api-worker does not require any field.

### american football
- `api-american-football/games` — body: e.g. `{ league: 1, season: 2024 }`.
- `api-american-football/games-events` — body: `{ id: 12345 }` (fixture id).
- `api-american-football/games-statistics-players` — body: `{ id: 12345 }`.
- `api-american-football/games-statistics-teams` — body: `{ id: 12345 }`.
- `api-american-football/leagues` — body: `{}` or `{ id, season, country, ... }`.
- `api-american-football/teams` — body: `{ league: 1, season: 2024 }`.
- `api-american-football/players` — body: `{ team: 1, season: 2024 }`.
- `api-american-football/players-statistics` — body: `{ id: 1, season: 2024 }`.
- `api-american-football/standings` — body: `{ league: 1, season: 2024 }`.
- `api-american-football/standings-conferences` — body: `{ league: 1, season: 2024 }`.
- `api-american-football/standings-divisions` — body: `{ league: 1, season: 2024 }`.
- `api-american-football/injuries` — body: `{ league: 1, season: 2024 }` or `{ team: 1, season: 2024 }`.
- `api-american-football/odds` — body: `{ league: 1, season: 2024 }` or `{ game: 12345 }`.
- `api-american-football/odds-bookmakers` — body: `{}`.

### football (soccer)
- `api-football/fixtures` — body: e.g. `{ league: 39, season: 2024 }` or `{ date: '2024-12-01' }`.
- `api-football/fixtures-events` — body: `{ fixture: 12345 }`.
- `api-football/fixtures-lineups` — body: `{ fixture: 12345 }`.
- `api-football/fixtures-statistics` — body: `{ fixture: 12345 }`.
- `api-football/fixtures-headtohead` — body: `{ h2h: '33-34' }`.
- `api-football/leagues` — body: `{}` or filters (`country`, `season`, etc.).
- `api-football/teams` — body: `{ league: 39, season: 2024 }`.
- `api-football/teams-statistics` — body: `{ team: 33, league: 39, season: 2024 }`.
- `api-football/players` — body: `{ team: 33, season: 2024 }` (or `{ id, season }`).
- `api-football/players-squads` — body: `{ team: 33 }`.
- `api-football/players-topscorers` — body: `{ league: 39, season: 2024 }`.
- `api-football/players-topassists` — body: `{ league: 39, season: 2024 }`.
- `api-football/standings` — body: `{ league: 39, season: 2024 }`.
- `api-football/predictions` — body: `{ fixture: 12345 }`.
- `api-football/injuries` — body: `{ league: 39, season: 2024 }` or `{ team: 33, season: 2024 }`.
- `api-football/transfers` — body: `{ team: 33 }` or `{ player: 100 }`.
- `api-football/coachs` — body: `{ team: 33 }`.
- `api-football/venues` — body: `{ id: 555 }` or `{ country: 'England' }`.
- `api-football/countries` — body: `{}`.

### basketball
- `api-basketball/games` — body: e.g. `{ league: 12, season: '2023-2024' }` or `{ date: '2024-12-01' }`.
- `api-basketball/games-h2h` — body: `{ h2h: '133-134' }`.
- `api-basketball/games-statistics-players` — body: `{ id: 12345 }`.
- `api-basketball/games-statistics-teams` — body: `{ id: 12345 }`.
- `api-basketball/leagues` — body: `{}` or filters.
- `api-basketball/teams` — body: `{ league: 12, season: '2023-2024' }`.
- `api-basketball/players` — body: `{ team: 1, season: '2023-2024' }`.
- `api-basketball/standings` — body: `{ league: 12, season: '2023-2024' }`.
- `api-basketball/standings-groups` — body: `{ league: 12, season: '2023-2024' }`.
- `api-basketball/standings-stages` — body: `{ league: 12, season: '2023-2024' }`.
- `api-basketball/statistics` — body: `{ league: 12, season: '2023-2024', team: 1 }`.
- `api-basketball/odds` — body: `{ league: 12, season: '2023-2024' }` or `{ game: 12345 }`.
- `api-basketball/bookmakers` — body: `{}`.
- `api-basketball/countries` — body: `{}`.

### baseball
- `api-baseball/games` — body: e.g. `{ league: 1, season: 2024 }` or `{ date: '2024-12-01' }`.
- `api-baseball/games-h2h` — body: `{ h2h: '1-2' }`.
- `api-baseball/leagues` — body: `{}` or filters.
- `api-baseball/teams` — body: `{ league: 1, season: 2024 }`.
- `api-baseball/teams-statistics` — body: `{ team: 1, league: 1, season: 2024 }`.
- `api-baseball/standings` — body: `{ league: 1, season: 2024 }`.
- `api-baseball/standings-groups` — body: `{ league: 1, season: 2024 }`.
- `api-baseball/standings-stages` — body: `{ league: 1, season: 2024 }`.
- `api-baseball/odds` — body: `{ league: 1, season: 2024 }` or `{ game: 12345 }`.
- `api-baseball/odds-bookmakers` — body: `{}`.
- `api-baseball/countries` — body: `{}`.

### f1
- `f1/season-schedule` — body: `{ season: 2024 }`.
- `f1/race-weekend` — body: `{ season: 2024, round: 1 }`.
- `f1/latest-race` — body: `{}`. Optional: `season` (default current year).
- `f1/race-results` — body: `{ season: 2024, round: 1 }`.
- `f1/qualifying` — body: `{ season: 2024, round: 1 }`.
- `f1/sprint` — body: `{ season: 2024, round: 1 }`.
- `f1/lap-times` — body: `{ season: 2024, round: 1 }`. Optional: `driverId`.
- `f1/pit-stops` — body: `{ season: 2024, round: 1 }`.
- `f1/driver-standings` — body: `{ season: 2024 }`. Optional: `round`.
- `f1/constructor-standings` — body: `{ season: 2024 }`. Optional: `round`.
- `f1/all-drivers` — body: `{ season: 2024 }`.
- `f1/all-constructors` — body: `{ season: 2024 }`.
- `f1/circuit-info` — body: `{ circuitId: 'monza' }`.

## Shopping

### amazon
- `amazon/search-products` — body: `{ query: 'iPhone 15' }`. Optional: `limit` (1–20, default 10). Returns products with pricing, ratings, delivery info.

## Transit

### mta (NYC MTA)
- `mta/feed` — body: `{ feedId: 'ace' }` (enum: `'ace' | 'bdfm' | 'g' | 'jz' | 'l' | 'nqrw' | '1234567' | 'sir'`). GTFS-RT feed.
- `mta/list-feeds` — body: `{}`. Lists feeds + the lines each covers.
- `mta/alerts` — body: `{}`. Optional: `line`.
- `mta/arrivals` — body: `{ line: 'A' }`. Optional: `stopId`.

## Science / Space

### nasa
- `nasa/apod` — body: `{}`. Optional: `date`, `start_date`, `end_date`, `count` (1–100), `thumbs`.
- `nasa/neo-feed` — body: `{}`. Optional: `startDate`, `endDate`.
- `nasa/neo-lookup` — body: `{ asteroidId: '3' }`.
- `nasa/neo-browse` — body: `{}`. Optional: `page`, `size` (1–100).
- `nasa/cme` — body: `{}`. Optional: `startDate`, `endDate` (default last 30 days).
- `nasa/flr` — body: `{}`. Optional: `startDate`, `endDate`.
- `nasa/gst` — body: `{}`. Optional: `startDate`, `endDate`.

## Documents

### latex
- `latex-compiler/compile` — body: either `{ document: '\\documentclass{article}\\begin{document}Hello\\end{document}' }` or `{ resources: [{ main: true, content: '...' }] }`. Optional: `compiler` (default `'pdflatex'`). Returns PDF base64, or an error with the compilation log.

## Response Format

All endpoints return:
```typescript
{ success: true, data: <endpoint-specific> } | { success: false, error: string }
```

`data` shape varies by endpoint. Common pattern: `data` is the raw upstream response (often an array for list endpoints, object for detail endpoints). Do not assume nested keys like `data.list` or `data.results` without verifying — check `Array.isArray(result.data)` first.

**Empty-response gotcha (repeated from Finance):** some endpoints return `success: true` with empty or zero-filled data instead of an error when the upstream has no matches — notably `finnhub/stock-price` (all-zero quote) and `alphavantage/search-symbols` (`{ bestMatches: [] }`). Check for the empty state explicitly in addition to `success`.

## OAuth

Currently only `google` requires OAuth. Users connect once; tokens are stored and auto-refreshed by the platform. Users can grant scopes incrementally (Gmail first, then Calendar, etc.) — the platform unions new scopes with previously granted ones so badges stay accurate.

### Error shape when OAuth is needed

When a Google endpoint is called without stored tokens, without a required scope, or with a token that has been revoked/expired, the api-worker returns HTTP 200 with this envelope:

```typescript
{
  success: true,             // <-- yes, true. The OAuth-required payload
  data: {                    //     rides under data, not as a top-level error.
    requiresOAuth: true,
    provider: 'google',
    scopes: string[],        // scopes needed for this call
    authUrl: string          // redirect the user here to grant consent
  }
}
```

The platform produces this response for three distinct failures (no tokens, insufficient scope 403, revoked/invalid 401), so one check handles all of them. **Always check `result.data?.requiresOAuth`, never `result.requiresOAuth` or `result.success === false`** — the SDK forwards the api-worker's `data` field as-is, so the OAuth fields are nested one level down. (Do not grep for the legacy `error: 'not_connected'` string either; that shape no longer applies.)

Client pattern:

```typescript
const result = await integration.post('google/gmail-send', { to, subject, content })
const oauth = result.data as { requiresOAuth?: boolean; authUrl?: string } | undefined
if (oauth?.requiresOAuth && oauth.authUrl) {
  window.open(oauth.authUrl, 'google-auth', 'width=500,height=600')
  // After the user completes consent, retry the call.
}
```

Type the response so this stays honest:

```typescript
type GoogleResult<T> = {
  success: boolean
  data?: T | { requiresOAuth: true; provider: 'google'; scopes: string[]; authUrl: string }
  error?: string
}
```

### Connection status

`GET /api/integrations/status` (authenticated) returns per-scope flags so UIs can show accurate badges:

```typescript
{
  google: {
    connected: boolean,
    gmailSend: boolean, gmailRead: boolean, gmail: boolean,
    calendar: boolean, drive: boolean, contacts: boolean
  }
}
```

Broader scopes imply narrower ones — e.g., a token with `gmail.modify` reports `gmailSend` and `gmailRead` as `true` automatically.

### Disconnect

`DELETE /api/integrations/oauth/google/disconnect` (authenticated) revokes and clears the user's stored Google tokens.
