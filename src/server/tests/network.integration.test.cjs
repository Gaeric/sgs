'use strict';

// Run after the server-only build, from src/server:
// NODE_PATH=./build node --test tests/network.integration.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const SocketIO = require('socket.io');
const client = require('../../ui/platforms/desktop/node_modules/socket.io-client');
const { LobbyEventChannel } = require('../build/server/channels/lobby.js');
const { WaitingRoomSocket } = require('../build/server/channels/waiting_room.js');
const { RoomService } = require('../build/server/services/room_service.js');
const { Sanguosha } = require('../build/core/game/engine.js');

// These const enums are erased by tsc. Lobby wire strings are the ordinal values
// in core/shares/types/server_types.ts; waiting-room names are from core/event/event.ts.
const Lobby = {
  QueryRoomList: '0',
  QueryVersion: '2',
  VersionMismatch: '3',
  PingServer: '4',
  CheckRoomExist: '5',
  CreateWaitingRoom: '6',
};
const Waiting = {
  PlayerEnter: 'PlayerEnter',
  PlayerLeave: 'PlayerLeave',
  PlayerReady: 'PlayerReady',
  PlayerChatMessage: 'PlayerChatMessage',
};
const WAIT_MS = 4000;
const SOCKET_ERRORS = ['connect_error', 'connect_timeout', 'error'];

// Version is populated by initialize() in production. Invoke only the compiled
// metadata parser: no card/character/skill registries or game processors are initialized.
Sanguosha.parseCoreVersion();
const version = Sanguosha.Version;
assert.equal(typeof version, 'string');
assert.ok(version.length > 0);

function waitFor(emitter, event, { action, signal, errors = SOCKET_ERRORS } = {}) {
  return new Promise((resolve, reject) => {
    let timer;
    const clean = () => {
      clearTimeout(timer);
      emitter.removeListener(event, received);
      for (const name of errors) emitter.removeListener(name, failed);
      signal?.removeEventListener('abort', aborted);
    };
    const received = (...args) => {
      clean();
      resolve(args[0]);
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
  const logger = { info() {} };
  const unused = () => {
    throw new Error('Preparation tests must never construct a game engine/ServerRoom');
  };
  // Same waiting-room factory and RoomService wiring as server/main.ts. Only
  // game-start factories are forbidden; the service and both channels are real.
  const roomService = new RoomService(
    io,
    unused,
    unused,
    unused,
    unused,
    unused,
    (info, roomId) => ({
      roomId,
      roomInfo: info,
      closedSeats: [],
      players: [],
      hostPlayerId: info.hostPlayerId,
      isPlaying: false,
    }),
    (namespace, roomInfo) => new WaitingRoomSocket(roomService, namespace, 'dev', logger, roomInfo),
    unused,
  );
  new LobbyEventChannel(roomService, io, {}).start();

  // Register cleanup before listening/connecting, so assertion and connect
  // failures also close every manager, namespace, engine transport and HTTP port.
  t.after(async () => {
    aborter.abort();
    // Discard server transports first. Disconnecting namespaces with close=true
    // first starts Engine.IO 3's graceful polling close (a 30-second timer),
    // which a subsequent io.close() cannot shorten once it is already closing.
    // Also bypass a buffered packet's drain wait: after an assertion failure a
    // peer may have unread broadcasts and no outstanding polling GET.
    for (const connection of Object.values(io.engine.clients)) connection.closeTransport(true);
    io.engine.close();
    for (const socket of sockets) socket.disconnect();
    for (const manager of managers) manager.close();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        server.closeAllConnections();
        reject(new Error('Timed out closing Socket.IO/HTTP fixture'));
      }, WAIT_MS);
      io.close(() => {
        clearTimeout(timer);
        resolve();
      });
      // Node HTTP keep-alive connections must not outlive this fixture. Upgraded
      // connections are closed by Socket.IO's engine.close(), not by this call.
      server.closeAllConnections();
    });
    assert.deepEqual(socketErrors, [], 'no unexpected socket errors');
  });
  await waitFor(server, 'listening', {
    errors: ['error'],
    signal: aborter.signal,
    action: () => server.listen(0, '127.0.0.1'),
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  const wait = (emitter, event, action, errors) => waitFor(emitter, event, { action, errors, signal: aborter.signal });
  const connect = async (namespace, manager) => {
    if (!manager) {
      manager = new client.Manager(url, {
        autoConnect: false,
        reconnection: false,
        timeout: WAIT_MS,
        transports: [transport],
        upgrade: false,
      });
      managers.add(manager);
    }
    const socket = manager.socket(namespace);
    sockets.add(socket);
    for (const name of SOCKET_ERRORS) {
      socket.on(name, error => socketErrors.push(`${namespace}: ${name}: ${String(error)}`));
    }
    await wait(socket, 'connect', () => socket.connect());
    assert.equal(socket.io.engine.transport.name, transport);
    return socket;
  };
  const request = (socket, event, payload, response = event) =>
    wait(socket, response, () => socket.emit(event, payload));
  const disconnect = async socket => {
    const serverSocket = io.of(socket.nsp).connected[socket.id];
    assert.ok(serverSocket, 'namespace is connected on the server before disconnect');
    // This listener runs after WaitingRoomSocket's disconnect listener. Its
    // completion is a barrier for room disposal, unlike a client disconnect event.
    await wait(serverSocket, 'disconnect', () => socket.disconnect(), ['error']);
    assert.equal(socket.connected, false);
  };
  return { connect, request, wait, disconnect };
}

function roomSettings(transport) {
  return {
    numberOfPlayers: 2,
    roomName: `network preparation (${transport})`,
    gameMode: 'standard-game', // GameMode.Standard, a const enum.
    excludedCharacters: [],
    cardExtensions: ['standard'],
    characterExtensions: ['standard'],
    allowObserver: true,
    coreVersion: version,
    hostPlayerId: 'host',
  };
}

for (const transport of ['polling', 'websocket']) {
  test(`Socket.IO 2 preparation lifecycle over ${transport}`, { timeout: 30000 }, async t => {
    assert.equal(require('socket.io/package.json').version, '2.4.1');
    const { connect, request, wait, disconnect } = await fixture(t, transport);
    const lobby = await connect('/lobby');
    const settings = roomSettings(transport);

    assert.equal(await request(lobby, Lobby.PingServer), undefined);
    // Despite its name, VersionMismatch carries true when versions match.
    assert.equal(await request(lobby, Lobby.QueryVersion, { version }, Lobby.VersionMismatch), true);
    assert.equal(
      await request(lobby, Lobby.QueryVersion, { version: 'incompatible-core' }, Lobby.VersionMismatch),
      false,
    );
    assert.deepEqual(
      await request(lobby, Lobby.CreateWaitingRoom, {
        roomInfo: { ...settings, coreVersion: 'incompatible-core' },
      }),
      { error: 'unmatched core version' },
    );
    assert.deepEqual(await request(lobby, Lobby.QueryRoomList), []);

    const created = await request(lobby, Lobby.CreateWaitingRoom, { roomInfo: settings });
    assert.equal(created.error, undefined);
    assert.equal(typeof created.roomId, 'number');
    assert.deepEqual(created.roomInfo, settings);
    const roomId = created.roomId;
    assert.equal(await request(lobby, Lobby.CheckRoomExist, roomId), true);
    const summary = activePlayers => ({
      name: settings.roomName,
      activePlayers,
      totalPlayers: 2,
      status: 'waiting',
      packages: ['standard'],
      id: roomId,
      gameMode: settings.gameMode,
      allowObserver: true,
    });
    assert.deepEqual(await request(lobby, Lobby.QueryRoomList), [summary(0)]);

    // The lobby and host share a Manager/Engine.IO connection, as sibling
    // namespaces in the desktop client do. The guest is a separate network peer.
    const host = await connect(`/waiting-room-${roomId}`, lobby.io);
    assert.equal(host.io, lobby.io);
    assert.deepEqual(
      await request(
        host,
        Waiting.PlayerEnter,
        {
          playerInfo: { playerId: 'rejected', avatarId: 0, playerName: 'Wrong version' },
          isHost: false,
          coreVersion: 'incompatible-core',
        },
        Waiting.PlayerLeave,
      ),
      { leftPlayerId: 'rejected', byKicked: false },
    );
    assert.deepEqual(await request(lobby, Lobby.QueryRoomList), [summary(0)]);
    const hostInfo = { playerId: 'host', avatarId: 1, playerName: 'Host' };
    const guestInfo = { playerId: 'guest', avatarId: 2, playerName: 'Guest' };
    const hostEntered = await request(host, Waiting.PlayerEnter, {
      playerInfo: hostInfo,
      isHost: true,
      coreVersion: version,
    });
    assert.deepEqual(hostEntered, {
      hostPlayerId: 'host',
      playerInfo: { ...hostInfo, seatId: 0, playerReady: false },
      otherPlayersInfo: [],
      roomInfo: settings,
      disableSeats: [],
    });
    // Connect the guest after the host's broadcast has completed, so its first
    // PlayerEnter packet cannot be an earlier host-entry broadcast in flight.
    const guest = await connect(`/waiting-room-${roomId}`);
    assert.notEqual(guest.io, lobby.io);
    const [hostSeesGuest, guestEntered] = await Promise.all([
      wait(host, Waiting.PlayerEnter),
      request(guest, Waiting.PlayerEnter, { playerInfo: guestInfo, isHost: false, coreVersion: version }),
    ]);
    assert.deepEqual(hostSeesGuest, guestEntered);
    assert.deepEqual(guestEntered, {
      hostPlayerId: 'host',
      playerInfo: { ...guestInfo, seatId: 1, playerReady: false },
      otherPlayersInfo: [{ ...hostInfo, seatId: 0, playerReady: false }],
      roomInfo: settings,
      disableSeats: [],
    });
    assert.deepEqual(await request(lobby, Lobby.QueryRoomList), [summary(2)]);

    const ready = { readyPlayerId: 'guest', isReady: true };
    const readyEvents = await Promise.all([
      wait(host, Waiting.PlayerReady),
      request(guest, Waiting.PlayerReady, ready),
    ]);
    for (const event of readyEvents) assert.deepEqual(event, ready);
    const chat = { from: 'guest', messageContent: 'ready to play' };
    const [hostChat, guestChat] = await Promise.all([
      wait(host, Waiting.PlayerChatMessage),
      request(guest, Waiting.PlayerChatMessage, chat),
    ]);
    assert.deepEqual(hostChat, guestChat);
    assert.equal(hostChat.from, chat.from);
    assert.equal(hostChat.messageContent, chat.messageContent);
    assert.ok(Number.isSafeInteger(hostChat.timestamp) && hostChat.timestamp > 0);

    const [hostSeesLeave, guestSeesLeave] = await Promise.all([
      wait(host, Waiting.PlayerLeave),
      request(guest, Waiting.PlayerLeave, { leftPlayerId: 'guest' }),
    ]);
    assert.deepEqual(hostSeesLeave, { leftPlayerId: 'guest', byKicked: false });
    assert.deepEqual(guestSeesLeave, hostSeesLeave);
    // Explicit leave is what updates the authoritative player array today.
    assert.deepEqual(await request(lobby, Lobby.QueryRoomList), [summary(1)]);
    // Disconnect currently also broadcasts PlayerLeave, even after an explicit
    // leave. Do not assert exactly-once delivery or disconnect-only removal.
    await disconnect(guest);
    assert.deepEqual(await request(lobby, Lobby.QueryRoomList), [summary(1)]);
    assert.equal(await request(lobby, Lobby.CheckRoomExist, roomId), true);

    assert.deepEqual(await request(host, Waiting.PlayerLeave, { leftPlayerId: 'host' }), {
      leftPlayerId: 'host',
      byKicked: false,
    });
    assert.deepEqual(await request(lobby, Lobby.QueryRoomList), [summary(0)]);
    await disconnect(host);
    assert.equal(lobby.connected, true, 'disconnecting waiting-room must not disconnect its lobby sibling');
    assert.equal(await request(lobby, Lobby.PingServer), undefined);
    assert.equal(await request(lobby, Lobby.CheckRoomExist, roomId), false);
    assert.deepEqual(await request(lobby, Lobby.QueryRoomList), []);
  });
}
