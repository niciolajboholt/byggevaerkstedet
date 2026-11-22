# Byggeværkstedet live sync backend

One SQLite-backed Durable Object (`LiveRoom`) owns each building room. A separate
`AdmissionGate` object per hashed client IP limits anonymous room creation to
6/minute and 30/UTC-day. LiveRoom commands are authenticated and limited to
120/minute per participant; WebSocket attachment counters provide an additional
120/minute bound. Each participant can have at most three active sockets.

Rooms expire after 24 hours. The alarm deletes the private room row and closes
its sockets. Tokens are random 192-bit values; only SHA-256 hashes persist.
Snapshots contain no tokens, token hashes, idempotency ledger, or raw IP address.
Request-body limits, a strict origin allowlist, fixed palette/24×24/250-brick bounds,
role ownership, revision checks and bounded idempotency protect the room state.

## Build and verify

```
cd sync
npm ci --ignore-scripts
npm run build
npm test
```

The bundled entrypoint is `sync/dist/worker.mjs`. Cloudflare's built-in
`cloudflare:workers` module remains external. `../build-tasks.js` is bundled so
server and browser use exactly the same assignment algorithm.

The Node tests exercise pure room transitions plus Worker/DO HTTP behavior with
a transactional in-memory SQLite adapter. They do not replace actual Workers
runtime checks of SQLite, hibernation and WebSocket upgrade. Run the deployed
synthetic room tests before activating the front-end endpoint.

## Deployment metadata

Upload `dist/worker.mjs` as `worker.mjs` with:

```json
{
  "main_module": "worker.mjs",
  "compatibility_date": "2026-11-22",
  "bindings": [
    {"type":"durable_object_namespace","name":"ROOMS","class_name":"LiveRoom"},
    {"type":"durable_object_namespace","name":"ADMISSION","class_name":"AdmissionGate"},
    {"type":"plain_text","name":"ALLOWED_ORIGINS","text":"https://niciolajboholt.github.io"}
  ],
  "migrations": {"new_tag":"v1","new_sqlite_classes":["LiveRoom","AdmissionGate"]},
  "observability": {"enabled":false}
}
```

Enable workers.dev for this new script only. No secrets or bindings from other
Workers are reused. The account's Free plan already applies a CPU limit; do not
set the custom `limits.cpu_ms` field, which Free rejects. Do not upgrade billing.
For subsequent deployments retain the existing v1 classes/bindings and do not
re-run an old migration with new/different classes.

Default production origin: `https://niciolajboholt.github.io`. Local/test origins
must be explicit additions in a separate test deployment, not a wildcard.

## Protocol

See `../LIVE_SYNC_CONTRACT.md`. HTTP errors use `{code,message,room?}`. A current
room snapshot is attached to conflict errors only after participant authentication.
Invitation tokens are read/join-only. The Worker unwraps typed RPC envelopes,
ensuring that DO errors retain their HTTP status without leaking runtime details.

The snapshot's `attached` count defines the ordered prefix of completed tasks;
`ready` may contain a later participant's prepared task. Undo deliberately keeps
all prepared pieces. Role claims are single-use, and reconnect requires the
participant token already saved by the browser, not a fresh invitation claim.
