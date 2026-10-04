# CY017 — Reusable Security Logging Module

TypeScript implementation of the Project Phoenix security logging module specified in
[`cy017-security-logging-monitoring-module-design-documentation-v0.5.md`](../cy017-security-logging-monitoring-module-design-documentation-v0.5.md).

## Files

| File | Purpose |
|---|---|
| `securityLogTypes.ts` | Typed enums (event types, severity, outcome, reason unions per event type) and the `SecurityLogRecord` shape. |
| `logTransport.ts` | `LogTransport` interface, default `ConsoleJsonTransport`, and a `NullTransport` for tests. |
| `expressLogContext.ts` | `fromRequest(req)` — extracts `ip_address`, `endpoint`, `method`, `user_id`, `role`, `request_id` from an Express request. |
| `securityLogger.ts` | Core `logSecurityEvent()` plus eight typed helpers (one per event type). |
| `examples.ts` | Minimal Express snippets showing each helper called from a typical middleware or route handler. |

## Quick start

```ts
import {
  fromRequest,
  logAuthFailure,
  logAccessRestricted,
  logTokenIssued,
} from './securityLogger';

// Inside a login handler:
const ctx = fromRequest(req);
if (!user) {
  logAuthFailure({
    ...ctx,
    reason: 'unknown_user',
    response_code: 401,
    rule_triggered: 'CY010 Rule 1 - Authentication Required',
  });
}

// Inside JWT middleware on a tampered token:
logAccessRestricted({
  ...ctx,
  reason: 'access_restricted_authentication',
  response_code: 401,
});
```

The full set of helpers:

| Helper | Event type | Reason values |
|---|---|---|
| `logAuthFailure` | `auth_failure` | `bad_password`, `unknown_user`, `account_locked`, `lockout_active` |
| `logTokenInvalid` | `token_invalid` | `expired`, `malformed`, `bad_signature`, `tampered_claims`, `refresh_expired`, `refresh_replay` |
| `logTokenIssued` | `token_issued` | (none — audit-only) |
| `logRbacDenied` | `rbac_denied` | (none for now) |
| `logValidationFailure` | `validation_failure` | `missing_field`, `invalid_type`, `invalid_enum`, `length_exceeded`, `bad_format`, `size_exceeded` |
| `logRateLimitExceeded` | `rate_limit_exceeded` | `rate_limit_hit`, `throttled` |
| `logDuplicateAlert` | `duplicate_alert` | (none) |
| `logAccessRestricted` | `access_restricted` | **Sync (4):** `access_restricted_authentication`, `access_restricted_rate_limit`, `access_restricted_throttling`, `access_restricted_duplicate`. **Async (7):** `repeated_rate_limit`, `repeated_throttling`, `repeated_duplicate`, `repeated_invalid_input`, `repeated_authentication_failure`, `repeated_rbac_denied`, `sustained_abuse_pattern`. |

## Output

Each helper emits a single newline-delimited JSON record to stdout via the default
`ConsoleJsonTransport`. Example:

```json
{"timestamp":"2026-05-06T03:14:22.481Z","component":"teavs-backend","event_type":"token_issued","severity":"info","outcome":"success","user_id":"usr_8821","role":"council_officer","ip_address":"203.0.113.42","endpoint":"/api/users/auth/login","method":"POST","response_code":200,"request_id":"f4d2b1a0-9c4e-4e2b-8f9a-1e6b3a7c2d5f","details":{"expires_in_min":30}}
```

## Swapping the transport later

When the backend is ready to persist or forward logs:

```ts
import { setLogTransport } from './securityLogger';
import { MyDatabaseTransport } from './myDatabaseTransport';

setLogTransport(new MyDatabaseTransport());
```

No call-site changes are needed.

## Dependencies

- Node.js standard library (`node:crypto.randomUUID()`).
- TypeScript ≥ 4.9.
- Express types (only imported by `expressLogContext.ts`); the core compiles without Express.

## What this module does NOT do

- It does not decide whether a request is valid, authorised, abusive or suspicious.
- It does not write to a database, SIEM, dashboard or remote log service in this phase.
- It does not aggregate events across windows — the asynchronous persistent-violation
  monitor (CY010 Rule 9) is a separate component that will consume these structured
  records and call `logAccessRestricted` with one of the seven async reasons.
- It does not log raw passwords, tokens, or full request bodies. The `details` field is
  sanitised on the way in (control characters stripped, strings truncated to 500 chars).
