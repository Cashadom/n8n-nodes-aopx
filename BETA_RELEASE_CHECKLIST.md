# AOPX n8n beta release checklist

## Scope

- [ ] Recommend Provider
- [ ] Report Outcome
- [ ] Get Public Stats
- [ ] No Execute Search claim in beta. AOPX currently recommends; the workflow executes.

## Evidence guardrails

- [ ] FACTUAL and COMPARISON are labelled beta, not universally validated.
- [ ] NEWS is labelled EXPERIMENTAL.
- [ ] NEWS mentions LAB-008 = PIVOT.
- [ ] NEWS is blocked unless the user explicitly enables experimental use.
- [ ] Serper is not presented as production-validated.
- [ ] Reported outcomes are not described as automatically validated evidence.

## Packaging

- [ ] `main` points to `dist/index.js`.
- [ ] npm package includes `dist`.
- [ ] credentials compile to `dist/credentials/AopxApi.credentials.js`.
- [ ] node compiles to `dist/nodes/Aopx/Aopx.node.js`.
- [ ] SVG icon is copied to `dist/nodes/Aopx/aopx.svg`.

## Commands

```bat
cd C:\Users\cyril\Desktop\aopx-labs\n8n-nodes-aopx
npm install
npm run build
npm run lint
npm run pack:check
```

## Manual API checks

- [ ] Recommend Provider succeeds against `https://api.aopx.fr/v1/recommend`.
- [ ] Response contains the production recommendation payload.
- [ ] Report Outcome succeeds against `/v1/outcome`.
- [ ] Public Stats succeeds against `/v1/public/stats`.
- [ ] NEWS warning is visible.
- [ ] NEWS request is refused when experimental opt-in is false.

## Security

- [ ] No provider keys in package.
- [ ] No AOPX secret in package.
- [ ] No `.env`.
- [ ] No SQLite/database files.
- [ ] No PEM/private key.
- [ ] `npm pack --dry-run` inspected before publication.

## Release

- [ ] Test in clean n8n instance.
- [ ] Commit beta package separately.
- [ ] Publish npm only after clean install/load test.
