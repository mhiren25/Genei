# AI Agents for Trading Order Entry — Overview

> **Scope:** eBanking (End Client) & Sales Node (Client Advisor)
> **Focus:** GUI, order entry UX, input parsing, validation, and pre-submission checks
> **Approach:** AI sits *on top of* existing processes — no changes to core order routing, execution, or compliance engine

---

## Design Principle

The existing order processing pipeline (validation engine, compliance checks, regulatory controls) remains **untouched**. AI agents act as a **smart front-door layer** — they prepare, pre-fill, and pre-validate orders *before* they reach the existing system, reducing friction without introducing new risk.

```
[Client / CA Input — text, voice, email, or form]
                    ↓
          [AI Agent Layer]   ← scope of this document
                    ↓
  [Existing Order Entry System — unchanged]
                    ↓
     [Validation Bot / Compliance / Execution]
```

---

## Input Channel Roadmap

Before the agents, it is worth noting that AI is already expanding *how* orders reach the system — independently of the agents described below.

| Channel | Status | What it does |
|---|---|---|
| Standard form (eBanking / Sales Node) | Live | Existing structured input |
| **Email Parser** | In progress | Extracts structured order intent from client or CA emails |
| **Voice to Text** | Planned | Transcribes spoken input (phone call or voice note) into text that feeds the NL Input Parser |

The Email Parser and Voice to Text are input pre-processors — their output feeds directly into **Agent 1** below, so the same agent pipeline handles all channels uniformly. This is an important architectural point: adding a new input channel does not require building a new pipeline.

---

## Agent 1 — Natural Language Input Parser

### What it does
Converts free-text input — typed, emailed, or transcribed from voice — into a structured order form: action, instrument, quantity, order type, account.

### Without AI
- Client/CA navigates dropdowns, searches for instrument, selects order type and quantity manually
- Typical time: 3–5 minutes per order
- CA must re-type what a client just said verbally

### With AI
- Client types or dictates: *"Buy 50 Nestlé shares for my savings account, limit at 95"* — form auto-populates
- CA captures client intent during a call in natural language — order draft is ready before the call ends
- Email from client is parsed on arrival — CA opens a pre-filled draft, not a blank form

### Realistic boundary
- Ambiguous instruments are surfaced for confirmation, not auto-selected (see Agent 2)
- Voice to Text accuracy depends on audio quality and financial terminology training — a review step is expected before submission

---

## Agent 2 — Instrument / Listing Resolver

### What it does
Resolves which security the user intends to trade when input is ambiguous — same company on multiple exchanges, ticker vs. company name vs. ISIN, or similar-sounding names.

### Without AI
- User searches, gets a list of results, must know which exchange or listing to pick
- CA asks the client clarifying questions: *"Do you mean the Swiss listing or the US ADR?"*
- Can take 2–4 back-and-forth exchanges

### With AI
- Agent uses the client's base currency, account type, and order history to rank candidates and surfaces the top 1–2 options with exchange, currency, and current indicative price shown inline
- One-tap confirmation replaces the disambiguation conversation entirely

### Realistic boundary
- Agent suggests, human confirms — no auto-selection without explicit user acknowledgment
- Relies on existing instrument master data; does not independently source market data

---

## Agent 3 — Strategy Order Suggester

### What it does
When a user describes a trading objective in free text or voice — rather than a simple buy/sell — the agent identifies whether a strategy order (e.g. TWAP, VWAP, iceberg, stop-limit, OCO) is appropriate and suggests the strategy type along with its key parameters.

This agent works alongside the strategy order module currently in development, extending it with an AI-assisted entry experience.

### Without AI
- CA or client must already know which strategy to use and manually fill all parameters
- Strategy selection requires product knowledge that many clients and even some CAs may lack
- Wrong parameter choices lead to validation failures or unintended execution behaviour

### With AI

**Example — Client input (eBanking, typed or voice):**
> *"I want to buy a large position in ABB but don't want to move the market"*

Agent suggests **TWAP** · Proposed duration: market hours · Slice size: auto · Rationale shown inline

**Example — CA input (Sales Node, during client call):**
> *"Client wants to protect downside on her Roche position but stay invested if it rebounds"*

Agent suggests **stop-limit or OCO** · Pre-fills trigger price range based on current price · Flags parameters CA should confirm with client before submitting

### Realistic boundary
- Agent suggests strategy and starting parameters — user adjusts and confirms before submission
- Parameters are starting points derived from the input and instrument context, not financial advice
- If intent is unclear, agent asks one targeted clarifying question rather than suggesting blindly

---

## Agent 4 — Smart Pre-Validation Agent

### What it does
Runs lightweight pre-checks on the draft order *before* it hits the existing validation bot, translating likely rejection reasons into plain language and offering corrective suggestions in real time.

This directly addresses the current experience where the validation bot returns error codes that are opaque to end users.

### Without AI
- User submits → validation bot rejects with a code (e.g. `ERR_MIN_NOTIONAL`, `SUITABILITY_BREACH`)
- User doesn't understand the error, contacts support or CA
- CA diagnoses, fixes, and resubmits — full cycle can take 15–30 minutes

### With AI
- Before submission, agent checks a defined set of known common rejection patterns: minimum order size, account/instrument currency mismatch, account-type restrictions
- Surfaces issues in plain language with a suggested fix: *"This order is below the minimum notional of CHF 1,000 — would you like to adjust the quantity to 11 shares?"*

### Realistic boundary
- Pre-validation only — the existing validation bot remains the authoritative check
- Agent works from a mapped set of known rejection patterns, not a live copy of the compliance rule engine
- Does not replicate or override regulatory checks — it catches the predictable ones early

---

## Agent 5 — Contextual Pre-Fill Agent

### What it does
Uses the client's account context, session data, and order history to pre-fill fields the system already knows — so users are never asked for information that can be inferred.

### Without AI
- Every order starts with a blank form
- User selects account, currency, and settlement mode even for repeat orders
- CA re-enters client standing instructions each time

### With AI
- Default account, currency, and order type pre-filled based on client profile and last activity
- CA opens an order for a client and their standing defaults are already populated — focus shifts to what is actually different this time

### Realistic boundary
- Reads from existing client and account data — no new data storage required
- All pre-filled fields are visible and editable — pre-fill is a starting point, never a hidden default

---

## Agent 6 — Order Summary & Confirmation Agent

### What it does
Before final submission, generates a plain-language order summary that replaces the current raw field-by-field review screen. Flags deviations from a client's normal behaviour as an additional safety check.

### Without AI
- Confirmation screen shows raw fields — ISIN codes, order type abbreviations, settlement date in system format
- Clients often confirm without fully understanding what they are approving
- CAs skim quickly and may miss a field mismatch

### With AI
- User sees: *"You are placing a limit order to buy 50 Nestlé shares (SIX Swiss Exchange, CHF) at a maximum of CHF 95.00, valid today, from your Investment Account"*
- CA additionally sees a deviation note if applicable: *"This order size is 4× larger than this client's typical trade — please confirm before submitting"*

### Realistic boundary
- Summary is generated from the structured order fields — no interpretation or added information
- Deviation flags are based on simple statistical heuristics (e.g. vs. 3-month average), not AI risk scoring

---

## Agent 7 — CA Workload Assistant *(Sales Node only)*

### What it does
Helps a CA manage multiple in-flight client orders during a busy session — a unified queue view showing drafts, submitted orders, and items awaiting client callback.

### Without AI
- CA juggles multiple tabs for different clients
- Drafts get forgotten, especially after interruptions
- No unified view across clients in a session

### With AI
- Queue dashboard: orders in draft / submitted / pending client confirmation
- Flags drafts idle beyond a configurable threshold — likely forgotten order
- Quick-resume: CA clicks a queued draft and full order context is restored instantly

### Realistic boundary
- Workflow UI enhancement for Sales Node — not a new system
- Works within existing session and draft-save capability
- Does not make decisions — only surfaces and organises

---

## Agent 8 — Transparency & Rationale Layer

### What it does
Wherever AI makes a suggestion — strategy type, pre-filled value, validation warning, or confirmation summary — it surfaces a brief plain-language explanation of *why* that suggestion was made. This is a cross-cutting behaviour applied across all agents, not a standalone screen.

### Is this feasible?
**Yes — and it matters.** LLM-based agents can produce inline rationale as part of their output at negligible additional latency. The key discipline is constraining explanations strictly to what the system actually knows (instrument data, account data, order history) and never presenting inferred reasoning as established fact.

From a regulatory standpoint, this layer also supports **auditability** — every AI-assisted action has a logged, human-readable rationale that can be reviewed if an order is questioned.

### Where it appears

| Moment | Example rationale shown |
|---|---|
| **Inline during entry** | Pre-filled field shows ℹ️ *"Defaulted to your Investment Account — used for your last 8 equity orders"* |
| **Strategy suggestion** | *"TWAP suggested because you indicated a large position size and preference to minimise market impact"* |
| **Pre-validation warning** | *"Minimum notional of CHF 1,000 applies to structured products on this account type"* |
| **Confirmation screen** | *"Your limit price of CHF 95.00 is 2.3% below the current market price of CHF 97.20"* |

### Realistic boundary
- Rationale is derived from the same data the agent used — not independently generated
- Kept to one sentence: always informative or actionable, never speculative
- Does not expose internal model logic — explains *what data* drove the suggestion

---

## What Is Explicitly Out of Scope

| Topic | Why excluded |
|---|---|
| Investment advice / portfolio strategy | Regulatory boundary — not within order entry scope |
| Portfolio analysis or performance reporting | Different system, different team |
| Emotion / sentiment detection | Unreliable in a trading context, adds regulatory complexity without clear benefit |
| FIX channel | B2B clients send machine-generated messages — NLP adds no value here |
| Real-time compliance decisions | Existing engine handles this — AI must not replicate or override it |

---

## Summary

| # | Agent | Key benefit |
|---|---|---|
| — | Input Channel Roadmap (Email · Voice) | Expands how orders reach the pipeline without rebuilding it |
| 1 | NL Input Parser | Skip form filling — type, speak, or email in plain language |
| 2 | Listing Resolver | One-tap disambiguation, no clarification back-and-forth |
| 3 | Strategy Order Suggester | Right strategy and parameters from plain-language intent |
| 4 | Smart Pre-Validation | Fix predictable errors before they hit the validation bot |
| 5 | Contextual Pre-Fill | Never re-enter what the system already knows |
| 6 | Order Summary & Confirmation | Confirm in plain language, deviation alerts before submit |
| 7 | CA Workload Assistant *(CA only)* | Unified client order queue, no forgotten drafts |
| 8 | Transparency & Rationale Layer | Every AI suggestion explained — trust and auditability |

---

*This document is an overview only. Each agent requires a detailed feasibility assessment, data access review, and regulatory sign-off before implementation.*
