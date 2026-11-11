# Networking migration baseline

These checkpoints add regression tests and targeted lifecycle fixes, **not a Socket.IO upgrade**. Production
still uses Socket.IO server **2.4.1** and desktop client **2.3.0**; Express is unchanged.

## Run

Install root, server and desktop dependencies first (skip the Electron binary
when appropriate). From the repository root:

```sh
yarn --cwd src/server test:network
```

The script rebuilds the server before running Node's built-in test runner. It
requires Node 24/26 and the desktop client installation; it is not a standalone
server-package test without those dependencies. CI runs it after both packages
are installed, in the Node 24/26 matrix. Local validation was on Node 26 only.

## What the tests establish

`network.integration.test.cjs` runs the compiled, real `LobbyEventChannel`,
`WaitingRoomSocket` and `RoomService` with real Socket.IO transports. Each test
uses an ephemeral loopback HTTP port and owns all clients/managers/server handles.
Game-start factories throw if invoked; only version metadata is parsed, without
initializing card, character or skill registries.

For polling and WebSocket separately:

- Lobby ping and correct/incorrect core-version query round trips.
- Rejected wrong-version room creation and player entry.
- Room creation, listing and existence checks.
- Host/guest entry, seat assignments, ready and chat broadcasts.
- Explicit guest leave, disconnect and updated authoritative player counts.
- Final explicit host leave/disconnect, room disappearance, and preservation of
  its lobby sibling namespace sharing the same Manager.

Waits and teardown are bounded. Server-side disconnect completion is the barrier
for room disposal; there are no arbitrary sleep delays or fixed port 2020.
Failure cleanup deliberately discards Engine.IO 3 transports to avoid its graceful
polling-close delay. This uses a **version-specific internal API in the test
fixture**, not production; replace it during a major-version migration.

The tests pin the current server version and wire enum values intentionally.
Update these assertions deliberately during migration, not merely to silence a
failure. The original integration file does **not** exercise `RealConnectionService`, browser
CORS, transport upgrades, abrupt disconnect/reentry, an actual game, or Electron.
Additional lifecycle and desktop service tests below cover selected additional paths.

## Migration audit (2026-11-11)

Registry metadata checked on this date reports **4.8.4** for both `socket.io` and
`socket.io-client`. This is a candidate, not installed or compatibility-approved.
The official 2→3 and 3→4 guides must both inform the migration.

| Area | Current code | Required decision/change |
| --- | --- | --- |
| Server factory/CORS | `src/server/main.ts`: `SocketIO.listen`, `origins: '*:*'` | Use the exported `Server` constructor and explicit CORS policy. Node client tests cannot establish browser cross-origin behavior. |
| Reconnect ownership | `src/core/network/socket.client.ts`: Socket-level `reconnect` handler | v3+ no longer forwards Manager events. Observe `socket.io` and remove only the owned Manager listener; preserve sibling namespaces and application reentry. Add a real interrupted-transport regression. |
| Namespace inventory | Existing `client_socket.test.ts` and this fixture use `Namespace.connected` | v3+ uses `Namespace.sockets`, a Map. Preserve behavior assertions when porting. |
| Types | Root/server/desktop legacy `@types/socket.io*`, `SocketIOClient.*`, default-import namespace types | Align runtime packages and use bundled v4 exported types. The server's v3 type stub currently pulls a separate nested v4 package: that is not the production runtime. |
| Payload/heartbeat | v2 defaults are inherited | Official guides note the 100 MB→1 MB payload default and 5s→20s heartbeat timeout changes. Review replay/bulk payload sizes and proxy settings; choose limits explicitly. |
| Protocol/deployment | Current v2 clients use Engine.IO 3 | v4 client cannot connect to v2 server. Coordinate deployment. If old cached/Electron clients must work, evaluate server-first `allowEIO3: true`, test that matrix, and define retirement of compatibility. Do not silently enable permanent legacy support. |
| Event contract | Numeric-string lobby/game events; string waiting-room events | Preserve wire values and payload shape independently of transport upgrades. |

### Pre-existing defects/gaps to address separately

These are source-audit findings, not assertions that the new happy-path tests
cover or fix them:

1. **Request correlation (partially addressed):** room-existence and version
   requests now use isolated, short-lived `forceNew` connections, preserving the
   old server wire protocol while preventing replies crossing requests/hosts.
   Room-list, ping and creation operations still use mutable shared callbacks;
   this checkpoint does not solve correlation for those operations.
2. **Version-query mismatch (fixed):** the desktop service now emits `QueryVersion`
   with `{ version: Sanguosha.Version }`, matching the production lobby handler.
   Real service/transport tests cover that exchange with controlled version
   metadata; actual application version initialization is not tested there.
3. **Ping/creation lifetime (partially addressed):** terminal service `close()`
   removes owned handlers, cancels boolean requests and guards pending creation
   continuations. Reused ping promises, redundant registrations, shared timestamps
   and chat subscription behavior during the open service lifetime remain. Chat
   `disconnect()` still adds a history listener rather than unsubscribing; no chat
   lifecycle redesign was included.
4. **Waiting-room removal (fixed for tested paths):** explicit leave, kick and
   abrupt disconnect share authoritative removal. It clears the socket mapping,
   emits leave once, transfers host outside active games, and ignores repeated
   enter packets; duplicate identities on different sockets are rejected only to
   that requester. This is not authenticated identity or a general security audit.
5. **Waiting-room lifetime (partially addressed):** terminal removal detaches owned
   namespace/socket listeners and deletes the service map. Tests cover reuse after
   disposal, active-game backing retention and exact room/channel identity during
   delayed game close. Empty namespace objects are not removed from Socket.IO's
   registry, and game `ServerSocket` teardown remains outside this checkpoint.
6. **Game requests:** `ServerSocket` resolves by event/player, not request token;
   repeated waits can overwrite unresolved promises and stale replies/AI timers can
   target newer waits. One `lastResponsiveEvent` is shared across players. Game
   reconnect timers lack terminal disposal. These require an engine-facing design
   and targeted tests, not a blanket transport-upgrade rewrite.

### Recommended next gates

1. Selected desktop service checks are fixed/tested below. Extend correlation
   coverage separately to creation, refresh and ping; do not claim those paths are
   safe merely because boolean checks are now isolated.
2. Waiting-room removal and return-lifetime regressions are added below. Actual
   automatic transport reconnect/rejoin remains a separate gap: the waiting-room
   client does not install a reconnect/reentry protocol.
3. Upgrade server and client together in source, port exported types/CORS/reconnect
   ownership, then run real v4↔v4 lifecycle/reconnect tests and any required v2-client
   compatibility tests. Keep Express, Electron and game rules unchanged.
4. Validate browser origins, polling→WebSocket upgrade, payload boundaries, server
   restart/replay recovery and packaged Electron clients before deployment.

## Waiting-room lifecycle checkpoint

The network script now runs **all** `tests/*.test.cjs` files:

- `network.integration.test.cjs`: the original 2 complete transport baselines.
- `waiting_room.lifecycle.test.cjs`: 16 real transport cases (8 each over polling
  and WebSocket) for duplicate enter, requester-only rejection, capacity limits,
  explicit leave/disconnect deduplication, abrupt peer loss, host transfer, kick,
  final-player cleanup, unjoined/rejected peer safety, namespace ID reuse and
  GameStart/return behavior with a stub game factory.
- `room_service.lifecycle.test.cjs`: 7 focused service cases with lightweight game
  factories and a controlled completion of the existing 1500ms return grace delay.
  They verify exact game-instance removal, duplicate-close idempotence, returning
  during grace, first return/leave while another game player still needs the room,
  newer/older overlapping game closure, same-ID replacement safety and final host
  reassignment. These are lifecycle fixtures, not a full game-engine run.

The server now keeps **active-game lifetime separate from room-list visibility**.
A valid return may make a room visible, but an empty roster cannot destroy its
backing channel while associated games (including their return grace period) are
still pending. When all associated games finish, an empty room closes; otherwise
an absent host is reassigned. Each delayed callback captures the exact backing
info/channel, tracks exact game instances, and cannot dispose a replacement ID or
a room still owned by another game. Per-IP quota release is once-only across
hangout and later closure, preserving existing no-recharge return policy.

Client regressions in `waiting_room.cleanup.test.tsx` additionally cover both host
fields, self-entry using the authoritative event host, rendered control flags,
and stale events after disposal. Explicit transfer/new-host notifications keep
`hostPlayerId` and `isHost` in sync; ref/shallow/deep semantics are unchanged.

Known boundaries: no automatic waiting-room reconnect/rejoin, no authenticated
player identity, no full action authorization or malformed-packet hardening, no
change to game rules, and no complete game namespace/timer disposal claim. Tests
use Engine.IO peer closure to simulate abrupt transport loss; they do not emulate
all real network failure modes or validate browser/Electron behavior.

## Desktop service request checkpoint

`src/ui/platforms/desktop/src/services/connection_service/real_connection_service.test.ts`
and `real_connection_service.integration.test.ts` add 20 unit and 10 real transport
cases. Build the server before running them (the integration suite imports the
compiled production lobby channel), then use the existing desktop Jest command:

```sh
yarn --cwd src/server build
cd src/ui/platforms/desktop
CI=true yarn test --watchAll=false --runInBand
```

Each boolean check has its own non-reconnecting `/lobby` connection/Manager, room
ID or version payload, one-shot validated boolean response, elapsed-time clock,
owned listeners and default **10-second deadline**. It disconnects and clears its
timer/listeners before invoking the callback. Reported ping is half the total
elapsed duration, including connection establishment, not a precise network RTT.
Independent sockets cost extra handshakes per check; they avoid requiring a new
request-ID/acknowledgement contract on deployed v2 servers. No server runtime
change or dependency bump is needed for this fix.

On timeout, transport failure or service close, requests cancel **without calling
the boolean callback**. The public API has no error channel: manufacturing `false`
would remove valid rooms or report a version mismatch. No new timeout popup was
added. Page-unmount guards remain necessary because the App owns the service;
leaving a page must not close shared service sockets. `close()` is terminal and
idempotent, cancels pending checks and prevents later emissions/subscriptions and
captured callbacks. Shared operations keep their existing open-service behavior.

Unit coverage includes reordered/multi-host replies, malformed/duplicate/stale
packets, synchronous connect/reply, independent timing, deadline/error/close cleanup
and pending create-continuation suppression. Integration tests exercise actual v2
polling and WebSocket separately with the compiled `LobbyEventChannel`; room-service
existence and engine version are controlled fixtures, not a running game engine.
The tests check legacy wire shape, request isolation, late/expired responses,
service shutdown and survival of shared lobby/chat connections.

## References checked

- Registry: <https://registry.npmjs.org/socket.io/latest>
- Registry: <https://registry.npmjs.org/socket.io-client/latest>
- Official 2→3 guide: <https://socket.io/docs/v4/migrating-from-2-x-to-3-0/>
- Official 3→4 guide: <https://socket.io/docs/v4/migrating-from-3-x-to-4-0/>
- Server options (`cors`, `allowEIO3`, payload/heartbeat): <https://socket.io/docs/v4/server-options/>
- Socket/Manager ownership: <https://socket.io/docs/v4/client-socket-instance/>
