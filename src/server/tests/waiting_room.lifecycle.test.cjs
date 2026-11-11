'use strict';

// After the server-only build: NODE_PATH=./build node --test tests/waiting_room.lifecycle.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const SocketIO = require('socket.io');
const client = require('../../ui/platforms/desktop/node_modules/socket.io-client');
const { WaitingRoomSocket } = require('../build/server/channels/waiting_room.js');
const { RoomService } = require('../build/server/services/room_service.js');
const { Sanguosha } = require('../build/core/game/engine.js');

assert.equal(require('socket.io/package.json').version, '2.4.1');
// Only parse metadata: never initialize card/character registries or the engine.
Sanguosha.parseCoreVersion();
const version = Sanguosha.Version;
const WAIT_MS = 4000;
const ERRORS = ['connect_error', 'connect_timeout', 'error'];

function waitFor(emitter, event, action, errors = ERRORS, signal) {
  return new Promise((resolve, reject) => {
    let timer;
    const clean = () => {
      clearTimeout(timer);
      emitter.removeListener(event, received);
      for (const name of errors) emitter.removeListener(name, failed);
      signal?.removeEventListener('abort', aborted);
    };
    const received = value => {
      clean();
      resolve(value);
    };
    const failed = error => {
      clean();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const aborted = () => failed(new Error(`Cancelled waiting for ${event}`));
    emitter.on(event, received);
    for (const name of errors) emitter.on(name, failed);
    signal?.addEventListener('abort', aborted, { once: true });
    timer = setTimeout(() => failed(new Error(`Timed out waiting for ${event}`)), WAIT_MS);
    if (signal?.aborted) return aborted();
    try {
      action?.();
    } catch (error) {
      failed(error);
    }
  });
}

async function fixture(t, transport) {
  const server = http.createServer();
  const io = SocketIO(server, { origins: '*:*' });
  const managers = new Set();
  const sockets = new Set();
  const socketErrors = [];
  const aborter = new AbortController();
  const records = [];
  const unused = () => {
    throw new Error('Lifecycle tests must never construct a game engine/ServerRoom');
  };
  const service = new RoomService(
    io,
    unused,
    unused,
    unused,
    unused,
    unused,
    (roomInfo, roomId) => ({
      roomInfo,
      roomId,
      players: [],
      closedSeats: [],
      hostPlayerId: roomInfo.hostPlayerId,
      isPlaying: false,
    }),
    (namespace, info) => {
      const channel = new WaitingRoomSocket(service, namespace, 'dev', { info() {} }, info);
      const record = { info, channel, closed: 0, hungOut: 0 };
      // Keep the real service callbacks; count invocations, not just their effects.
      const onClosed = channel.onClosed;
      const onGameStarting = channel.onGameStarting;
      channel.onClosed = callback =>
        onClosed(() => {
          record.closed++;
          callback();
        });
      channel.onGameStarting = callback =>
        onGameStarting(() => {
          record.hungOut++;
          callback();
        });
      records.push(record);
      return channel;
    },
    unused,
  );
  const gameCalls = [];
  service.createRoom = (gameInfo, roomInfo, waitingRoomId) => {
    gameCalls.push({ gameInfo, roomInfo, waitingRoomId });
    return { roomId: waitingRoomId + 10000, gameInfo };
  };
  t.after(async () => {
    aborter.abort();
    // Avoid Engine.IO 3's graceful polling close/drain timers, including on failure.
    for (const connection of Object.values(io.engine.clients)) connection.closeTransport(true);
    io.engine.close();
    for (const socket of sockets) socket.disconnect();
    for (const manager of managers) manager.close();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        server.closeAllConnections();
        reject(new Error('Timed out closing lifecycle fixture'));
      }, WAIT_MS);
      io.close(() => {
        clearTimeout(timer);
        resolve();
      });
      server.closeAllConnections();
    });
    assert.deepEqual(socketErrors, [], 'no unexpected socket errors');
  });
  const wait = (emitter, event, action, errors) => waitFor(emitter, event, action, errors, aborter.signal);
  await wait(server, 'listening', () => server.listen(0, '127.0.0.1'), ['error']);
  const url = `http://127.0.0.1:${server.address().port}`;
  const create = (numberOfPlayers = 3, roomId = 100 + records.length, ip = 'host-ip') => {
    service.createWaitingRoom(
      {
        roomId,
        numberOfPlayers,
        roomName: `lifecycle ${transport}`,
        gameMode: 'standard-game',
        excludedCharacters: [],
        cardExtensions: ['standard'],
        characterExtensions: ['standard'],
        allowObserver: true,
        coreVersion: version,
        hostPlayerId: 'host',
      },
      ip,
    );
    return records[records.length - 1];
  };
  const connect = async record => {
    const manager = new client.Manager(url, {
      autoConnect: false,
      reconnection: false,
      timeout: WAIT_MS,
      transports: [transport],
      upgrade: false,
    });
    managers.add(manager);
    const socket = manager.socket(`/waiting-room-${record.info.roomId}`);
    sockets.add(socket);
    for (const name of ERRORS) socket.on(name, error => socketErrors.push(`${name}: ${String(error)}`));
    await wait(socket, 'connect', () => socket.connect());
    assert.equal(socket.io.engine.transport.name, transport);
    return socket;
  };
  const request = (socket, event, payload, response = event) =>
    wait(socket, response, () => socket.emit(event, payload));
  const enterPayload = (playerId, coreVersion = version) => ({
    playerInfo: { playerId, playerName: playerId, avatarId: 1 },
    isHost: playerId === 'host',
    coreVersion,
  });
  const join = async (record, playerId) => {
    const socket = await connect(record);
    await request(socket, 'PlayerEnter', enterPayload(playerId));
    return socket;
  };
  const disconnect = async (socket, abrupt = false) => {
    const peer = io.of(socket.nsp).connected[socket.id];
    assert.ok(peer, 'server namespace socket exists before disconnect');
    // Installed after production handlers: completion means all removal/disposal ran.
    await wait(peer, 'disconnect', () => (abrupt ? socket.io.engine.close() : socket.disconnect()), ['error']);
  };
  const barrier = async (sender, observers = []) => {
    const messageContent = `barrier-${++barrier.sequence}`;
    const echoes = observers.map(socket => wait(socket, 'PlayerChatMessage'));
    echoes.push(request(sender, 'PlayerChatMessage', { from: 'barrier', messageContent }));
    for (const echo of await Promise.all(echoes)) assert.equal(echo.messageContent, messageContent);
  };
  barrier.sequence = 0;
  return { service, create, connect, join, request, wait, disconnect, barrier, enterPayload, gameCalls };
}

function events(socket, name) {
  const received = [];
  socket.on(name, value => received.push(value));
  return received;
}
function roster(record, ids) {
  assert.deepEqual(record.info.players.map(p => p.playerId).sort(), [...ids].sort());
  assert.deepEqual(Object.values(record.channel.connectedPlayersMap).sort(), [...ids].sort());
}
function host(record, id) {
  assert.equal(record.info.hostPlayerId, id);
  assert.equal(record.info.roomInfo.hostPlayerId, id);
}

for (const transport of ['polling', 'websocket']) {
  test(`${transport}: duplicate enter is idempotent; another socket cannot take over`, { timeout: 20000 }, async t => {
    const f = await fixture(t, transport);
    const r = f.create();
    const owner = await f.join(r, 'host');
    const witness = await f.join(r, 'guest');
    await f.barrier(witness, [owner]);
    const ownerEnters = events(owner, 'PlayerEnter');
    const witnessEnters = events(witness, 'PlayerEnter');
    const ownerLeaves = events(owner, 'PlayerLeave');
    const witnessLeaves = events(witness, 'PlayerLeave');
    owner.emit('PlayerEnter', f.enterPayload('host'));
    await f.barrier(owner, [witness]);
    assert.deepEqual(ownerEnters, []);
    assert.deepEqual(witnessEnters, []);
    const duplicate = await f.connect(r);
    assert.deepEqual(await f.request(duplicate, 'PlayerEnter', f.enterPayload('host'), 'PlayerLeave'), {
      leftPlayerId: 'host',
      byKicked: false,
    });
    await f.barrier(duplicate, [owner, witness]);
    assert.deepEqual(ownerEnters, []);
    assert.deepEqual(witnessEnters, []);
    assert.deepEqual(ownerLeaves, []);
    assert.deepEqual(witnessLeaves, []);
    roster(r, ['host', 'guest']);
    assert.equal(r.channel.connectedPlayersMap[owner.id], 'host');
    assert.equal(r.channel.connectedPlayersMap[duplicate.id], undefined);
    await f.disconnect(duplicate);
    await f.barrier(owner, [witness]);
    assert.deepEqual(ownerLeaves, []);
    assert.equal(r.closed, 0);
    roster(r, ['host', 'guest']);
  });

  test(`${transport}: capacity rejects at and above the limit, only to the requester`, { timeout: 20000 }, async t => {
    const f = await fixture(t, transport);
    const r = f.create(2);
    const owner = await f.join(r, 'host');
    await f.join(r, 'guest');
    await f.barrier(owner);
    const leaves = events(owner, 'PlayerLeave');
    const extra = await f.connect(r);
    for (const limit of [2, 1]) {
      r.info.roomInfo.numberOfPlayers = limit;
      assert.deepEqual(await f.request(extra, 'PlayerEnter', f.enterPayload('extra'), 'PlayerLeave'), {
        leftPlayerId: 'extra',
        byKicked: false,
      });
      await f.barrier(extra, [owner]);
      roster(r, ['host', 'guest']);
      assert.deepEqual(leaves, []);
    }
    await f.disconnect(extra);
    assert.equal(r.closed, 0);
  });

  test(
    `${transport}: explicit leave is once-only; final removal disposes and namespace ID can be reused`,
    { timeout: 20000 },
    async t => {
      const f = await fixture(t, transport);
      const r = f.create();
      const rejected = await f.connect(r);
      await f.request(rejected, 'PlayerEnter', f.enterPayload('bad', 'bad-version'), 'PlayerLeave');
      await f.disconnect(rejected);
      const neverJoined = await f.connect(r);
      await f.disconnect(neverJoined);
      assert.equal(r.closed, 0, 'unjoined/rejected peers cannot dispose an empty valid room');
      assert.equal(f.service.checkRoomExist(r.info.roomId), true);
      const owner = await f.join(r, 'host');
      const guest = await f.join(r, 'guest');
      await f.barrier(guest, [owner]);
      const leaves = events(owner, 'PlayerLeave');
      await Promise.all([f.wait(owner, 'PlayerLeave'), f.request(guest, 'PlayerLeave', { leftPlayerId: 'guest' })]);
      roster(r, ['host']);
      await f.disconnect(guest);
      await f.barrier(owner);
      assert.equal(leaves.length, 1);
      const unjoined = await f.connect(r);
      await f.disconnect(unjoined);
      assert.equal(r.closed, 0);
      assert.equal(f.service.checkRoomExist(r.info.roomId), true);
      await f.request(owner, 'PlayerLeave', { leftPlayerId: 'host' });
      roster(r, []);
      assert.equal(r.closed, 1);
      assert.equal(f.service.waitingRoomMaps.has(r.info.roomId), false);
      assert.equal(f.service.checkRoomExist(r.info.roomId), false);
      await f.disconnect(owner);
      assert.equal(r.closed, 1);
      assert.equal(f.service.hostPlayerIps.get('host-ip'), 0);
      const replacement = f.create(3, r.info.roomId);
      const newOwner = await f.join(replacement, 'host');
      await f.barrier(newOwner);
      roster(replacement, ['host']);
      roster(r, []);
      assert.equal(r.closed, 1, 'disposed namespace handler did not process the new connection');
      await f.request(newOwner, 'PlayerLeave', { leftPlayerId: 'host' });
      assert.equal(replacement.closed, 1);
      assert.equal(f.service.hostPlayerIps.get('host-ip'), 0);
    },
  );

  test(
    `${transport}: abrupt guest/host disconnect removes roster and hands off both host fields`,
    { timeout: 20000 },
    async t => {
      const f = await fixture(t, transport);
      const r = f.create();
      const owner = await f.join(r, 'host');
      const guest = await f.join(r, 'guest');
      const successor = await f.join(r, 'successor');
      await f.barrier(successor, [owner, guest]);
      const leaves = events(successor, 'PlayerLeave');
      await Promise.all([f.wait(successor, 'PlayerLeave'), f.disconnect(guest, true)]);
      roster(r, ['host', 'successor']);
      host(r, 'host');
      await Promise.all([f.wait(successor, 'PlayerLeave'), f.disconnect(owner, true)]);
      roster(r, ['successor']);
      host(r, 'successor');
      assert.equal(leaves.length, 2);
      assert.equal(leaves[1].newHostPlayerId, 'successor');
      await f.disconnect(successor);
      roster(r, []);
      assert.equal(r.closed, 1);
      assert.equal(f.service.waitingRoomMaps.has(r.info.roomId), false);
    },
  );

  test(
    `${transport}: ChangeHost and explicit host leave update authoritative state for later joins`,
    { timeout: 20000 },
    async t => {
      const f = await fixture(t, transport);
      const r = f.create();
      const owner = await f.join(r, 'host');
      const guest = await f.join(r, 'guest');
      const change = { prevHostPlayerId: 'host', newHostPlayerId: 'guest' };
      await Promise.all([f.wait(guest, 'ChangeHost'), f.request(owner, 'ChangeHost', change)]);
      host(r, 'guest');
      const late = await f.connect(r);
      const entered = await f.request(late, 'PlayerEnter', f.enterPayload('late'));
      assert.equal(entered.hostPlayerId, 'guest');
      assert.equal(entered.roomInfo.hostPlayerId, 'guest');
      await f.barrier(late, [owner, guest]);
      const leaves = events(owner, 'PlayerLeave');
      const left = await f.request(guest, 'PlayerLeave', { leftPlayerId: 'guest' });
      assert.equal(left.newHostPlayerId, 'host');
      roster(r, ['host', 'late']);
      host(r, 'host');
      await f.disconnect(guest);
      await f.barrier(owner);
      assert.equal(leaves.length, 1);
    },
  );

  test(
    `${transport}: seat kick clears roster/mapping and disconnect cannot emit a second leave`,
    { timeout: 20000 },
    async t => {
      const f = await fixture(t, transport);
      const r = f.create();
      const owner = await f.join(r, 'host');
      const guest = await f.join(r, 'guest');
      await f.barrier(guest, [owner]);
      const leaves = events(owner, 'PlayerLeave');
      const seatId = r.info.players.find(p => p.playerId === 'guest').seatId;
      const [left] = await Promise.all([
        f.wait(owner, 'PlayerLeave'),
        f.request(owner, 'SeatDisabled', { seatId, disabled: true, kickedPlayerId: 'guest' }),
      ]);
      assert.deepEqual(left, { leftPlayerId: 'guest', byKicked: true });
      roster(r, ['host']);
      assert.ok(r.info.closedSeats.includes(seatId));
      await f.disconnect(guest);
      await f.barrier(owner);
      assert.equal(leaves.length, 1);
      assert.equal(r.closed, 0);
      await f.disconnect(owner);
      assert.equal(r.closed, 1);
    },
  );

  for (const removal of ['explicit', 'disconnect']) {
    test(
      `${transport}: GameStart/${removal} preserves return state; valid return alone resets playing`,
      { timeout: 20000 },
      async t => {
        const f = await fixture(t, transport);
        const r = f.create();
        const owner = await f.join(r, 'host');
        const guest = await f.join(r, 'guest');
        const other = f.create(); // Same-IP quota must not be released twice for r.
        assert.equal(f.service.isValidToCreateWaitingRoom('host-ip'), false);
        await f.barrier(guest, [owner]);
        const [started] = await Promise.all([
          f.request(owner, 'GameStart', { roomInfo: r.info.roomInfo }),
          f.wait(guest, 'GameStart'),
        ]);
        assert.deepEqual(started.otherPlayersId, ['host', 'guest']);
        assert.equal(f.gameCalls.length, 1);
        assert.equal(f.gameCalls[0].waitingRoomId, r.info.roomId);
        assert.equal(r.info.isPlaying, true);
        if (removal === 'explicit') {
          await Promise.all([f.wait(guest, 'PlayerLeave'), f.request(owner, 'PlayerLeave', { leftPlayerId: 'host' })]);
          await f.disconnect(owner);
        } else {
          await Promise.all([f.wait(guest, 'PlayerLeave'), f.disconnect(owner, true)]);
        }
        roster(r, ['guest']);
        host(r, 'host'); // Transition must preserve the game's host, not reassign it.
        if (removal === 'explicit') {
          await f.request(guest, 'PlayerLeave', { leftPlayerId: 'guest' });
          roster(r, []);
          assert.equal(r.hungOut, 1);
        }
        await f.disconnect(guest, removal === 'disconnect');
        roster(r, []);
        host(r, 'host');
        assert.equal(r.info.isPlaying, true);
        assert.equal(r.closed, 0);
        assert.equal(r.hungOut, 1);
        assert.equal(f.service.waitingRoomMaps.get(r.info.roomId), r.channel);
        assert.ok(f.service.waitingRooms.includes(r.info));
        assert.equal(f.service.hostPlayerIps.get('host-ip'), 1);
        const rejected = await f.connect(r);
        assert.deepEqual(
          await f.request(rejected, 'PlayerEnter', f.enterPayload('bad', 'bad-version'), 'PlayerLeave'),
          { leftPlayerId: 'bad', byKicked: false },
        );
        assert.equal(r.info.isPlaying, true);
        await f.disconnect(rejected);
        assert.equal(r.hungOut, 1);
        assert.equal(r.closed, 0);
        const idle = await f.connect(r);
        await f.disconnect(idle);
        assert.equal(r.hungOut, 1);
        assert.equal(r.info.isPlaying, true);
        const returning = await f.join(r, 'host');
        assert.equal(r.info.isPlaying, false);
        roster(r, ['host']);
        host(r, 'host');
        await f.request(returning, 'PlayerLeave', { leftPlayerId: 'host' });
        await f.disconnect(returning);
        assert.equal(r.closed, 0, 'returning then leaving cannot destroy an active game backing room');
        r.channel.finishGame(); // Lightweight game fixture has now finished.
        assert.equal(r.closed, 1);
        assert.equal(r.hungOut, 1);
        assert.equal(f.service.waitingRoomMaps.has(r.info.roomId), false);
        assert.equal(f.service.hostPlayerIps.get('host-ip'), 1, 'hangout then close releases quota only once');
        assert.ok(f.service.waitingRooms.includes(other.info));
        f.create();
        assert.equal(f.service.isValidToCreateWaitingRoom('host-ip'), false);
      },
    );
  }
}
