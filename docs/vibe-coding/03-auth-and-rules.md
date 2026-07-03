# Auth & Security Rules

> Google + Anonymous only. Rules never assume email exists.

## Auth providers

| Provider | Use |
|---|---|
| Google | Primary identity |
| Anonymous | Frictionless demos |
| Email/password, SAML, MFA | ❌ Product stage |

## Anonymous-safe rules

Anonymous users have `request.auth.uid` but **no** `request.auth.token.email`.

```javascript
function isSignedIn() {
  return request.auth != null;
}

function hasVerifiedEmail() {
  return isSignedIn() && request.auth.token.email != null;
}
```

- User-owned paths: `request.auth.uid == userId` (works for both Google and anonymous)
- Email-gated collections: `hasVerifiedEmail()` only

See [template/backend/rules/](../../template/backend/rules/firestore.rules).

## Data model (POC)

```
users/{uid}/items/{itemId}    ← subcollections scoped to uid
emailGated/{docId}            ← Google users only
```

## Firestore guardrails

| Rule | Limit |
|---|---|
| Queries | `limit(25)`, indexed fields only |
| Collection groups | Banned |
| Listeners | Small queries only |
| Writes | Batch thoughtfully (1 write/sec per document) |

## Rules tests (real project, no emulators)

```bash
FIREBASE_API_KEY=<web api key> pnpm --filter backend run test:rules
```

Tests live in `backend/rules/*.test.ts` and run against the **deployed** rules of the real project (emulators are too heavy locally - playbook bans them). They sign in anonymously, assert the allow/deny paths, and clean up after themselves. Skipped when `FIREBASE_API_KEY` is unset; deploy rules first with `npx firebase-tools deploy --only firestore:rules`.

## App Check

Enable before first real user. Use debug tokens locally (document in `.env.schema` comments).
