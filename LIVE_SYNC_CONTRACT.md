# Live Sync v1 — shared implementation contract

API base: `https://byggevaerkstedet-sync.nicolajbach12.workers.dev` (root will verify before app activation).
Room expires 24 hours after creation. Max 3 builders, pattern max 24x24 / 300 bricks (catalogue UI: club crests up to 300, other themes up to 250), palette as build-tasks.js/catalogue. Shared-screen offline flow remains unchanged. No accounts required.

- POST `/rooms` JSON `{model:{id,name,p},builders:["Jens","Alfred"],smallest:null|index}` -> `{roomId,inviteToken,token,me:0,room}`. Host is builder0, slot0 claimed at create. All tokens cryptographically random >=128 bits. Store token hashes, never include credentials in snapshots/logs.
- POST `/rooms/:roomId/join` Authorization Bearer inviteToken, JSON `{builder:1}` -> `{token,me:1,room}`. Slots atomically claim once. Local client persists per-room credential for resume; invite alone cannot reclaim occupied slot. Return409 if occupied. Snapshot via valid invite is permitted for join selection; never returns credentials.
- GET `/rooms/:roomId` Authorization Bearer participantToken OR inviteToken -> room snapshot. Invite token only read/join, no commands.
- GET `/rooms/:roomId/ws` WebSocket protocols `['bv-sync',participantToken]`. Response selects `bv-sync`. WS origin exact app origin allowlist. Initial message snapshot. JSON parse/body limits, no arbitrary paths.
- POST `/rooms/:roomId/commands` Authorization Bearer participantToken, JSON command; same semantics as WS, for testing/reconnect fallback.
- GET `/health` -> `{ok:true,version:'1'}`.

Snapshot `room={v:1,roomId,model,builders,smallest,planId,revision,attached,ready:[taskIds],participants:[{index,claimed,connected}],expiresAt,closed:false}`. `attached` is count of tasks already attached in plan order. Both client/server regenerate BuildTasks.createPlan(model.p,{builderCount:builders.length,smallest}). Future tasks can be ready before previous attachments.

WS client `{type:'command',command:{id,expectedRevision,action:'ready'|'attach'|'undo'|'close',taskId?}}`; server `{type:'snapshot',room}` on accepted mutation and initial connect; `{type:'error',code,message,room?}` on failure. POST command -> `{room}` or non2xx `{code,message,room?}`.

Rules: idempotent command id, optimistic revision check, authenticated role owner. `ready`: only owner's FIRST unattached task, even if earlier other-owner task isn't attached; may hold one ready task per owner. `attach`: only current global task, ready and owned by caller. `undo`: only host or owner of last attached task; rolls back attached prefix by1, leaves that task ready and does not erase other prepared pieces. `close`: host only, closed room rejects all mutation. Duplicate command returns current snapshot without applying twice. Revision increments once per accepted change. Idempotency ledger bounded.

Persist all coordination state in per-room SQLite-backed DO. Hibernating WebSockets, restore attachments after wake. No await between load/update storage transaction (serialize mutations). Alarm deletes expired room and credentials; close sockets on expiry. Rate-limit creation and command abuse. One room DO per roomId; separate IP admission buckets if needed. Exact Origin allowlist includes https://niciolajboholt.github.io; CORS authorization header preflight. No logging query tokens, names or WebSocket credentials.

Front-end invitation URL fragment: `#live=` + encodeURIComponent(JSON.stringify({roomId,inviteToken})). Private credential stays local; fragment only invitation. QR encodes that URL locally (no third-party QR service). LiveSyncUI.init hooks create/join; `LiveSyncUI.active()` gates its render; own UI controller handles live draw using drawGrid taskView and existing COLORS. Keep root index hooks small and explicit. No overwrite of cooperative.js/core categories by UI agent.

## Connected plan version 2

Room snapshots include `planVersion` (2 for new rooms; missing means 1 for existing records). Clients must reconstruct the pinned version before comparing `planId`. Never apply a version 1 attached index or ready ledger to a version 2 task list. The modern UI offers a new room for legacy plans while leaving original records untouched. Each version 2 task is one contiguous piece, and after the initial piece it touches the accumulated assembly for every connected catalogue pattern, including after smaller-task splitting.
