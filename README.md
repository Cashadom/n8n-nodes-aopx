# n8n-nodes-aopx

AOPX is an evidence-based provider-selection layer for software agents.

**Beta scope:** AOPX recommends the provider path. The calling n8n workflow executes
the provider request, then can report the real outcome back to AOPX.

> Evidence over claims.

## Operations

### Recommend Provider

Calls:

`POST /v1/recommend`

Use this when a workflow needs to choose a supported SEARCH provider instead of
hard-coding one provider.

Current public beta profiles:

- **FACTUAL** — beta.
- **COMPARISON** — beta.
- **NEWS** — **experimental**.

NEWS is deliberately marked experimental because LAB-008 ended **PIVOT**:
no provider satisfied the preregistered NEWS validation conditions.

LAB-008:
- 60 fresh NEWS missions.
- 180 provider calls.
- scoring: `search-v4-news`.
- Brave success @ .85: 1.67%.
- Tavily success @ .85: 1.67%.
- Serper success @ .85: 0%.
- no provider validated.
- production effect: NONE.

The node blocks NEWS by default. A user must explicitly enable
**Allow Experimental NEWS** to request an experimental recommendation.

### Report Outcome

Calls:

`POST /v1/outcome`

After the workflow executes the recommendation, send the observed result back to
AOPX using the returned `recommendation_id`.

A reported outcome is not automatically promoted into validated public evidence
or into production routing policy.

### Get Public Stats

Calls:

`GET /v1/public/stats`

Reads aggregated public production-outcome statistics.

## Important product boundary

This beta does **not** execute Brave, Tavily, Serper, or another search provider
inside the AOPX node.

The current flow is:

```text
n8n
  -> AOPX Recommend Provider
  -> workflow executes selected provider
  -> AOPX Report Outcome
```

An `Execute Search` operation should only be added when AOPX has an explicit
server-side execution endpoint and its behavior is covered by production policy.

## Credentials

Default base URL:

`https://api.aopx.fr`

The API key field is optional during an unauthenticated public beta and ready for
future authenticated access.

## Build

```bash
npm install
npm run build
npm run lint
npm run pack:check
```

## Local n8n test

From this package directory:

```bash
npm install
npm run build
npm link
```

Then link the package into the n8n custom-node environment according to your
local n8n installation and restart n8n.

## Publish gate

Do not publish to npm until all of these pass:

- `npm run build`
- `npm run lint`
- `npm run pack:check`
- node loads in a clean n8n instance
- Recommend Provider returns a real `recommendation_id`
- NEWS displays its experimental warning and is blocked by default
- Report Outcome accepts a real recommendation
- Get Public Stats returns the current public payload
- no API keys, `.env` files, databases, PEM files, or tokens are in the package

## Evidence note

LAB-008 is evidence about NEWS retrieval under the frozen
`search-v4-news` benchmark. It does not automatically change production routing.

AOPX keeps benchmarks, self-tests, pilots, and external production outcomes as
separate evidence classes.
