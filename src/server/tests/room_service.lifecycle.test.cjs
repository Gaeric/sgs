'use strict';

// After the server-only build, from src/server:
// NODE_PATH=./build node --test tests/room_service.lifecycle.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
// Load the channel first, matching the server's engine/event dependency order.
const { WaitingRoomSocket } = require('../build/server/channels/waiting_room.js');
const { RoomService } = require('../build/server/services/room_service.js');
const { Sanguosha } = require('../build/core/game/engine.js');
const { System } = require('../build/core/shares/libs/system.js');

// Metadata only: do not initialize the engine or any card/character registries.
Sanguosha.parseCoreVersion();
const version = Sanguosha.Version;

function fixture(t) {
  const namespaces = new Map();
  const records = [];
  const games = [];
  const sleeps = [];
  const originalSleep = System.MainThread.sleep;
  // These tests run sequentially. Keep the real grace boundary, but control its completion.
  System.MainThread.sleep = milliseconds => {
    let resolve;
    const promise = new Promise(done => {
      resolve = done;
    });
    sleeps.push({ milliseconds, resolve });
    return promise;
  };
  t.after(() => {
    System.MainThread.sleep = originalSleep;
    for (const record of records) record.channel.dispose();
  });
  const lobby = {
    of(name) {
      if (!namespaces.has(name)) namespaces.set(name, new EventEmitter());
      return namespaces.get(name);
    },
  };
  const lightweight = () => ({});
  const service = new RoomService(
    lobby,
    lightweight,
    (roomId, gameInfo, socket, processor, analytics, players, flavor, mode, rules, stack, waitingRoomInfo) => {
      const game = {
        RoomId: roomId,
        WaitingRoomInfo: waitingRoomInfo,
        getRoomInfo: () => ({ id: roomId, status: 'playing' }),
        onClosed(callback) {
          const backing = service.waitingRooms.find(info => info.roomId === waitingRoomInfo.roomId);
          assert.equal(backing?.isPlaying, true, 'mark the backing room active before registering game closure');
          game.close = callback;
        },
      };
      games.push(game);
      return game;
    },
    lightweight,
    lightweight,
    lightweight,
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
      const record = { info, channel, namespace, closed: 0, hungOut: 0, finished: 0 };
      // Count actual production lifecycle callbacks without replacing their behavior.
      const onClosed = channel.onClosed;
      channel.onClosed = callback =>
        onClosed(() => {
          record.closed++;
          callback();
        });
      const onGameStarting = channel.onGameStarting;
      channel.onGameStarting = callback =>
        onGameStarting(() => {
          record.hungOut++;
          callback();
        });
      const finishGame = channel.finishGame.bind(channel);
      channel.finishGame = () => {
        record.finished++;
        return finishGame();
      };
      records.push(record);
      return channel;
    },
    lightweight,
  );
  const create = (roomId = 100 + records.length) => {
    service.createWaitingRoom(
      {
        roomId,
        numberOfPlayers: 3,
        roomName: 'service lifecycle',
        gameMode: 'standard-game',
        excludedCharacters: [],
        cardExtensions: ['standard'],
        characterExtensions: ['standard'],
        allowObserver: true,
        coreVersion: version,
        hostPlayerId: 'host',
      },
      'host-ip',
    );
    return records[records.length - 1];
  };
  let peerId = 0;
  const enter = (record, playerId) => {
    const peer = new EventEmitter();
    peer.id = `peer-${++peerId}`;
    peer.rejections = [];
    peer.on('PlayerLeave', event => peer.rejections.push(event));
    record.channel.onPlayerEnter(peer)({
      playerInfo: { playerId, playerName: playerId, avatarId: 1 },
      isHost: playerId === 'host',
      coreVersion: version,
    });
    assert.deepEqual(peer.rejections, [], 'the returning peer must not be rejected');
    assert.equal(record.channel.connectedPlayersMap[peer.id], playerId);
    return peer;
  };
  const leave = (record, peer, playerId) => record.channel.onPlayerLeave(peer)({ leftPlayerId: playerId });
  const start = (record, roomId = 1000 + games.length) => {
    const gameInfo = { ...record.info.roomInfo, flavor: 'dev' };
    const result = service.createRoom(gameInfo, { ...record.info.roomInfo, roomId }, record.info.roomId);
    assert.equal(result.roomId, roomId);
    return games[games.length - 1];
  };
  return { service, create, enter, leave, start, games, sleeps };
}

function retained(f, record) {
  assert.ok(f.service.waitingRooms.includes(record.info), 'retain the original backing info');
  assert.equal(f.service.waitingRoomMaps.get(record.info.roomId), record.channel, 'retain the original channel');
  assert.equal(record.closed, 0);
  assert.equal(record.namespace.listenerCount('connection'), 1, 'the channel still accepts connections');
}

function roster(record, ids) {
  assert.deepEqual(
    record.info.players.map(player => player.playerId),
    ids,
  );
  assert.deepEqual(Object.values(record.channel.connectedPlayersMap), ids);
}

test('an active game survives first return/leave and admits a second returning player', t => {
  const f = fixture(t);
  const record = f.create();
  const host = f.enter(record, 'host');
  const guest = f.enter(record, 'guest');
  // Exercise the real GameStart path as well as the real service factories.
  record.channel.onGameStart(host)({ roomInfo: record.info.roomInfo });
  assert.equal(f.games.length, 1);
  assert.equal(record.info.isPlaying, true);
  f.leave(record, host, 'host');
  f.leave(record, guest, 'guest');
  roster(record, []);
  retained(f, record);
  assert.equal(record.hungOut, 1);

  const firstReturn = f.enter(record, 'host');
  assert.equal(record.info.isPlaying, false, 'a valid return makes the room visible again');
  f.leave(record, firstReturn, 'host');
  roster(record, []);
  retained(f, record);
  assert.equal(record.info.hostPlayerId, 'host', 'an active game retains its host even after isPlaying resets');
  const secondReturn = f.enter(record, 'guest');
  roster(record, ['guest']);
  assert.equal(record.info.isPlaying, false);
  assert.equal(record.finished, 0);
  f.leave(record, secondReturn, 'guest');
  retained(f, record);
});

test('game closure removes only its game once; empty backing disposal waits for the grace period', async t => {
  const f = fixture(t);
  const record = f.create();
  const other = f.create();
  const host = f.enter(record, 'host');
  const game = f.start(record);
  f.leave(record, host, 'host');
  assert.equal(f.service.hostPlayerIps.get('host-ip'), 1, 'starting releases only this room quota');
  // Reused game IDs must not make closure remove a different game instance.
  const unrelatedGame = f.start(other, game.RoomId);

  const closing = game.close();
  assert.deepEqual(f.service.rooms, [unrelatedGame], 'the closing game is removed before the grace delay');
  assert.equal(f.sleeps.length, 1);
  assert.equal(f.sleeps[0].milliseconds, 1500);
  const duplicateClosing = game.close();
  assert.equal(f.sleeps.length, 1, 'duplicate closure must not schedule a second cleanup');
  assert.equal(record.finished, 0);
  assert.equal(record.info.isPlaying, true);
  retained(f, record);

  f.sleeps[0].resolve();
  await Promise.all([closing, duplicateClosing]);
  assert.equal(record.finished, 1);
  assert.equal(record.info.isPlaying, false);
  assert.equal(record.closed, 1);
  assert.equal(record.namespace.listenerCount('connection'), 0, 'empty backing channel is disposed');
  assert.equal(f.service.waitingRooms.includes(record.info), false);
  assert.equal(f.service.waitingRoomMaps.has(record.info.roomId), false);
  assert.equal(f.service.hostPlayerIps.get('host-ip'), 1, 'hangout then closure does not release quota twice');
  assert.ok(f.service.waitingRooms.includes(other.info));
  await game.close();
  assert.equal(record.finished, 1);
  assert.equal(record.closed, 1);
  assert.equal(f.sleeps.length, 1);
  f.create();
  assert.equal(f.service.isValidToCreateWaitingRoom('host-ip'), false, 'the unrelated quota remains charged');
});

test('a player returning during the grace period keeps the finished backing room open', async t => {
  const f = fixture(t);
  const record = f.create();
  const host = f.enter(record, 'host');
  const game = f.start(record);
  f.leave(record, host, 'host');
  const closing = game.close();
  const returning = f.enter(record, 'host');
  f.sleeps[0].resolve();
  await closing;
  retained(f, record);
  roster(record, ['host']);
  assert.equal(record.finished, 1);
  assert.equal(record.info.isPlaying, false);
  f.leave(record, returning, 'host');
  assert.equal(record.closed, 1, 'after game completion the final leave really closes the backing room');
});

test('an old delayed close cannot finish a newer game on the same backing room', async t => {
  const f = fixture(t);
  const record = f.create();
  const host = f.enter(record, 'host');
  const oldGame = f.start(record);
  f.leave(record, host, 'host');
  const oldClosing = oldGame.close();
  const returning = f.enter(record, 'host');
  const newGame = f.start(record);
  f.leave(record, returning, 'host');
  f.sleeps[0].resolve();
  await oldClosing;
  assert.equal(record.finished, 0, 'the newer game owns this exact backing info now');
  assert.equal(record.info.isPlaying, true);
  assert.deepEqual(f.service.rooms, [newGame]);
  retained(f, record);

  const newClosing = newGame.close();
  assert.equal(f.sleeps.length, 2);
  f.sleeps[1].resolve();
  await newClosing;
  assert.equal(record.finished, 1);
  assert.equal(record.closed, 1);
});

test('an old delayed callback cannot dispose a replacement waiting room with the same ID', async t => {
  const f = fixture(t);
  const original = f.create();
  const host = f.enter(original, 'host');
  const game = f.start(original);
  f.leave(original, host, 'host');
  const closing = game.close();
  // Explicitly finish the obsolete backing so a fresh room can reuse its namespace/ID.
  original.channel.finishGame();
  assert.equal(original.closed, 1);
  const replacement = f.create(original.info.roomId);
  assert.notEqual(replacement.info, original.info);
  assert.notEqual(replacement.channel, original.channel);
  const replacementGame = f.start(replacement);
  f.sleeps[0].resolve();
  await closing;
  assert.equal(original.finished, 1, 'the delayed callback must not finish the obsolete channel again');
  assert.equal(replacement.finished, 0);
  assert.equal(replacement.info.isPlaying, true);
  retained(f, replacement);
  assert.deepEqual(f.service.rooms, [replacementGame]);
  f.enter(replacement, 'host');
  roster(replacement, ['host']);
  assert.equal(f.service.hostPlayerIps.get('host-ip'), 1);
});

test('finishing with a returning nonhost reassigns both authoritative host fields', async t => {
  const f = fixture(t);
  const record = f.create();
  const host = f.enter(record, 'host');
  const game = f.start(record);
  f.leave(record, host, 'host');
  const closing = game.close();
  f.enter(record, 'guest');
  assert.equal(record.info.hostPlayerId, 'host');
  assert.equal(record.info.roomInfo.hostPlayerId, 'host');
  const changes = [];
  record.namespace.on('ChangeHost', event => changes.push(event));
  f.sleeps[0].resolve();
  await closing;
  assert.equal(record.info.hostPlayerId, 'guest');
  assert.equal(record.info.roomInfo.hostPlayerId, 'guest');
  assert.equal(record.info.isPlaying, false);
  assert.deepEqual(changes, [{ prevHostPlayerId: 'host', newHostPlayerId: 'guest' }]);
  retained(f, record);
  roster(record, ['guest']);
  await game.close();
  assert.equal(changes.length, 1, 'duplicate closure does not broadcast a second host change');
});

test('closing a newer game first still retains the backing for an older live game', async t => {
  const f = fixture(t);
  const record = f.create();
  const firstHost = f.enter(record, 'host');
  const oldGame = f.start(record);
  f.leave(record, firstHost, 'host');
  const returning = f.enter(record, 'host');
  const newerGame = f.start(record);
  f.leave(record, returning, 'host');
  const newerClosing = newerGame.close();
  f.sleeps[0].resolve();
  await newerClosing;
  assert.equal(record.finished, 0);
  retained(f, record);
  assert.deepEqual(f.service.rooms, [oldGame]);
  const oldClosing = oldGame.close();
  f.sleeps[1].resolve();
  await oldClosing;
  assert.equal(record.finished, 1);
  assert.equal(record.closed, 1);
});
