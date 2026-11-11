# Networking migration baseline

This checkpoint adds tests and an audit, **not a Socket.IO upgrade**. Production
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
failure. These tests do **not** exercise `RealConnectionService`, browser CORS,
transport upgrades, abrupt disconnect/reentry, an actual game, or Electron.

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

1. **Request correlation:** `RealConnectionService` has one mutable callback per
   operation shared across hosts. Overlapping checks replace the callback; a reply
   contains no room/request identifier. The lobby page fix captures destinations,
   but cannot solve this lower-level routing issue. Use a separately designed
   correlation strategy (for example, request IDs/acknowledgements with timeouts)
   or a carefully bounded serialized legacy protocol. Add real service tests.
2. **Version-query mismatch:** the desktop service emits `VersionMismatch` without
   a payload, while the server listens for `QueryVersion` with `{ version }`.
   This fixture sends the correct server protocol directly; it does not prove the
   desktop version check works.
3. **Ping/creation lifetime:** ping promises are reused after settlement, nested
   registration adds redundant listeners, and one timestamp is shared across
   operations. Creation continuations can outlive `close()`. Chat `disconnect()`
   adds a listener instead of removing subscriptions. Audit these as App-owned
   service resources, without closing shared sockets from page cleanup.
4. **Waiting-room disconnect:** only explicit leave removes authoritative players;
   disconnect alone can leave stale seats. Disconnect after explicit leave emits
   another PlayerLeave. Repeated enter and host reassignment need dedicated tests.
   The baseline intentionally verifies explicit leave only, not exactly-once leave.
5. **Room lifetime:** close removes application collection entries but does not
   fully dispose namespace listeners/maps. Recreating a supplied room ID can
   accumulate handlers. Add teardown/room-ID reuse tests before promising leak-free
   room lifecycle.
6. **Game requests:** `ServerSocket` resolves by event/player, not request token;
   repeated waits can overwrite unresolved promises and stale replies/AI timers can
   target newer waits. One `lastResponsiveEvent` is shared across players. Game
   reconnect timers lack terminal disposal. These require an engine-facing design
   and targeted tests, not a blanket transport-upgrade rewrite.

### Recommended next gates

1. Fix/test the desktop service version query and overlapping request correlation
   in an isolated checkpoint, preserving legacy wire compatibility where possible.
2. Add abrupt-disconnect/reentry, duplicate-entry and room-disposal regressions;
   fix confirmed lifecycle defects separately.
3. Upgrade server and client together in source, port exported types/CORS/reconnect
   ownership, then run real v4↔v4 lifecycle/reconnect tests and any required v2-client
   compatibility tests. Keep Express, Electron and game rules unchanged.
4. Validate browser origins, polling→WebSocket upgrade, payload boundaries, server
   restart/replay recovery and packaged Electron clients before deployment.

## References checked

- Registry: <https://registry.npmjs.org/socket.io/latest>
- Registry: <https://registry.npmjs.org/socket.io-client/latest>
- Official 2→3 guide: <https://socket.io/docs/v4/migrating-from-2-x-to-3-0/>
- Official 3→4 guide: <https://socket.io/docs/v4/migrating-from-3-x-to-4-0/>
- Server options (`cors`, `allowEIO3`, payload/heartbeat): <https://socket.io/docs/v4/server-options/>
- Socket/Manager ownership: <https://socket.io/docs/v4/client-socket-instance/>
