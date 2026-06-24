# n8n-nodes-viber-bm

An [n8n](https://n8n.io) community node for the **Rakuten Viber Business
Messages API** (spec v11.3).

Unlike a thin one-to-one API wrapper, this node is organised around **what you
want to send** — Text, Template, Image, File, Video, List, Carousel — and
computes the underlying Viber message type for you. No memorising numeric type
codes like `233` or `1702`.

[Why this node](#why-this-node) · [Install](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Examples](#examples) · [Development](#development)

## Why this node

- **Content-first operations.** Pick `Send Image` and a layout
  ("Image Only", "Text + Image + Button", "Full Screen") instead of guessing
  whether you need type 7, 107, 8, 108, 208 or 210.
- **Structured inputs, not raw JSON.** List options and carousel cards are
  built with n8n's native repeatable fields. Template variables can be entered
  as key/value pairs or JSON.
- **Real error handling.** Viber returns HTTP `200` even when a send fails — the
  outcome hides in a `status` field. This node reads it and raises a
  descriptive error (`SRVC_NOT_VIBER_USER`, `SRVC_INVALID_PHONE_NUMBER`,
  `TEMPLATE_NOT_FOUND`, …) so failures don't masquerade as successes.
- **Validation before the network call.** Text/caption/file-name lengths,
  list (2–10) and carousel (2–5) counts, video size/duration and TTL bounds are
  checked locally with clear messages.
- **Simplified output by default** — `status`, `messageToken`, `seq` and
  `sessionId` — with a toggle to return Viber's full payload.
- **AI-ready.** Exposed as a tool (`usableAsTool`) so AI Agent nodes can send
  Viber messages directly.
- **Continue-on-fail & paired items** for clean batch processing.
- **v11.3 features:** animated GIF (`#imageFormat`), session Quick Replies
  (type 802), and the new button-style list UI (`list_message_ui_type`).

## Installation

### Community Nodes (recommended)

In n8n go to **Settings → Community Nodes → Install** and enter:

```
n8n-nodes-viber-bm
```

### Manual (self-hosted)

```bash
npm install n8n-nodes-viber-bm
```

Then restart n8n.

## Credentials

Viber Business Messages authenticates by whitelisting your server's IP
addresses against your numeric **Service ID** — there is no API token.

1. **Credentials → Add Credential** → search **Viber Business Messages API**.
2. Enter your **Service ID** (sender ID) and save.
3. Ensure the public IP your n8n instance sends from is whitelisted with Viber
   (arranged during onboarding).

## Operations

| Operation | What it sends | Key options |
|-----------|---------------|-------------|
| **Send Text** | Plain text | Delivery: Transactional / Promotional / Session |
| **Send Text + Button** | Promotional text with an action button | Reach, button caption + URL |
| **Send Template** | Approved transactional / OTP template | Reach, Template ID, language, variables (key-value or JSON) |
| **Send Image** | Image or animated GIF | Layout (image only, or +text +button), GIF toggle |
| **Send File** | Document / PDF / spreadsheet link | Category, file URL, name, type |
| **Send Video** | Video with thumbnail | Layout (plain, +text, +button, +action button) |
| **Send List** | Quick Replies (2–10 options) | Category, UI style (radio / buttons) |
| **Send Carousel** | 2–5 scrollable cards | Per-card image + up to 2 buttons |

Each operation also exposes an **Additional Fields** collection:

- **Sequence** — your request/response correlation ID (defaults to a timestamp).
- **Tag** — free text for custom reports.
- **TTL** — delivery window, 30–1209600 s (default 14 days).
- **Tracking Data** — returned to your webhook on reply (auto-filled where the
  message type requires it; set here to override).

## Output

Simplified (default):

```json
{ "status": 0, "seq": 123456, "messageToken": "5379697806260881548", "sessionId": "7888877812345678901" }
```

`sessionId` appears only for session message types (Image/File/Text in an
active session). Turn **Simplify** off to receive Viber's full response.

On failure the node throws an error carrying the Viber status code and its
meaning, e.g. *"Viber rejected the message (status 9)"* →
`SRVC_NOT_VIBER_USER — The destination number is not a registered Viber user.`

## Examples

**Send a promotional image with a button**

- Operation: `Send Image`
- Layout: `Text + Image + Button (All Devices)`
- Image URL: `https://example.com/promo.png`
- Message Text: `Summer sale is live!`
- Button Caption: `Shop now`
- Button / Action URL: `https://example.com/sale`

**Send an OTP template**

- Operation: `Send Template`
- Template ID: `2c017482-…`
- Template Language: `en`
- Parameters Input: `Key-Value Pairs` → `pin = 1234`

**Send Quick Replies**

- Operation: `Send List`
- List Title: `How was your delivery?`
- UI Style: `Buttons (New)`
- Options: `Great`, `Okay`, `Bad`

## Notes & limits

- **Text:** max 1000 UTF-8 chars (85 for List titles).
- **Template params:** max 125 chars per value, TEXT only, no URLs. OTP
  templates require a non-empty `pin` or the send is rejected.
- **Caption:** max 30 chars; empty caption + URL hides the button (Viber 17.5+).
- **Video:** size and duration are mandatory (≤200 MB, ≤600 s); host must allow
  HEAD requests and return `Content-Length`.
- **Carousel:** 2–5 cards; title 2–38, primary label ≤10, secondary label ≤12.
  Append `?inactiveViberLink=true` to a primary button URL to hide buttons on a
  card.
- **GIF** needs recipient Viber 28.1+; **button list UI** needs 27.8.2+.
- Use secured HTTPS media URLs that include a file extension.

## Message type reference

The node hides Viber's numeric type codes behind operations and layouts, but
they are listed here for reference and for anyone migrating from a code that
addressed types directly.

### Supported Message Types

| Type | Category | Description | Reached via |
|------|----------|-------------|-------------|
| 1701 | Transactional | Template (Smartphone only) | Send Template → Reach: Smartphone Only |
| 1702 | Transactional | Template (All Devices) | Send Template → Reach: All Devices |
| 6 | Transactional | Text Only (Smartphone) [Legacy] | — (legacy, use Template) |
| 106 | Transactional | Text Only (All Devices) [Legacy] | — (legacy, use Template) |
| 206 | Transactional | Text Only (All Devices) [Legacy] | Send Text → Transactional (Legacy) |
| 225 | Promotional | Text Only | Send Text → Promotional |
| 306 | Session | Text Only | Send Text → Session |
| 7 | Promotional | Image/GIF Only (Smartphone) | Send Image → Image Only (Smartphone) |
| 107 | Promotional | Image/GIF Only (All Devices) | Send Image → Image Only (All Devices) |
| 207 | Promotional | Image/GIF Only (All Devices) | — |
| 307 | Session | Image/GIF Only | Send Image → Image Only (Session) |
| 8 | Promotional | Text + Image + Button (Smartphone) | Send Image → Text + Image + Button (Smartphone) |
| 108 | Promotional | Text + Image + Button (All Devices) | Send Image → Text + Image + Button (All Devices) |
| 208 | Promotional | Text + Image + Button (All Devices) | — |
| 210 | Promotional | Text + Image + Button (Full Screen Image) | Send Image → Text + Image + Button (Full Screen) |
| 9 | Promotional | Text + Button (Smartphone) | Send Text + Button → Reach: Smartphone Only |
| 109 | Promotional | Text + Button (All Devices) | Send Text + Button → Reach: All Devices |
| 209 | Promotional | Text + Button (All Devices) | — |
| 220 | Transactional | File | Send File → Transactional |
| 221 | Session | File | Send File → Session |
| 222 | Transactional | File (No Tracking) | Send File → Transactional (No Tracking) |
| 223 | Transactional | File (Smartphone) | Send File → Transactional (Smartphone) |
| 224 | Session | File (Smartphone) | Send File → Session (Smartphone) |
| 230 | Promotional | Video | Send Video → Video Only |
| 231 | Promotional | Video + Text | Send Video → Video + Text |
| 232 | Promotional | Video + Text + Button | Send Video → Video + Text + Button (Opens Video) |
| 233 | Promotional | Video + Text + Action Button | Send Video → Video + Text + Action Button (Opens URL) |
| 801 | Transactional | Quick Replies / List | Send List → Transactional |
| 802 | Session | Quick Replies / List | Send List → Session |
| 901 | Promotional | Carousel | Send Carousel |

> Legacy text types 6/106 and the bare types 207/8/208/209 have no dedicated UI
> option because Viber recommends the newer equivalents; they remain documented
> here for completeness.

### Node Fields

Fields are shown contextually based on the selected operation and layout.

| Field | Operation(s) |
|-------|--------------|
| Destination | all |
| Label | all |
| Delivery | Send Text |
| Reach | Send Text + Button, Send Template |
| Template ID / Language / Parameters | Send Template |
| Message Text | Send Text, Send Text + Button, Send Image (with button), Send Video (with text), Send List (title), Send Carousel |
| Layout | Send Image, Send Video |
| Image URL / Animated GIF | Send Image |
| Category | Send File, Send List |
| File URL / File Name / File Type | Send File |
| Video URL / Thumbnail URL / File Size / Duration | Send Video |
| Button Caption / Button Action URL | Send Text + Button, Send Image (button layouts), Send Video (button layouts) |
| UI Style / Options | Send List |
| Cards | Send Carousel |
| Simplify | all |
| Additional Fields (Sequence, Tag, TTL, Tracking Data) | all |

## Project structure

```
nodes/ViberBusinessMessage/
  ViberBusinessMessage.node.ts   # thin router → per-operation body builders
  descriptions.ts                # resource/operation UI definition
  GenericFunctions.ts            # API request, type resolution, validation
  types.ts                       # status codes, limits, type constants
credentials/
  ViberBusinessMessagesApi.credentials.ts
```

## Development

```bash
npm install        # use --ignore-scripts if a native dep fails to compile
npm run build      # tsc + copy icons → dist/
npm run dev        # watch mode
npm run lint       # eslint with the n8n-nodes-base ruleset
```

## API reference

- Endpoint: `POST https://services.viber.com/vibersrvc/1/send_message`
- Viber Business Messages API documentation (v11.3).

## License

[MIT](LICENSE)
