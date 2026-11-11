/** @jest-environment node */
import { LobbySocketEvent } from 'core/shares/types/server_types';
import { ClientConfig, ServerHostTag } from 'props/config_props';
import SocketIO from 'socket.io';
import SocketIOClient from 'socket.io-client';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { VersionCheckListenerResponse } from './connection_service';
import { RealConnectionService } from './real_connection_service';

jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'integration-version' } }));
jest.mock('socket.io-client', () => {
  const actual = jest.requireActual('socket.io-client');
  return {
    __esModule: true,
    default: (uri: string, options?: SocketIOClient.ConnectOpts) => {
      // Only select the real transport; connection, events and teardown remain real Socket.IO behavior.
      const socket = actual(uri, { ...options, transports: [mockTransport] });
      mockClients.push({ socket, options });
      return socket;
    },
  };
});

// These paths are relative to this service directory, not the desktop package root.
const createSocketServer = jest.requireActual<typeof SocketIO>('../../../../../../server/node_modules/socket.io');
const { LobbyEventChannel } = jest.requireActual('../../../../../../server/build/server/channels/lobby');
const roomEvent = LobbySocketEvent.CheckRoomExist.toString();
const versionEvent = LobbySocketEvent.VersionMismatch.toString();
let mockTransport: string;
let mockClients: { socket: SocketIOClient.Socket; options?: SocketIOClient.ConnectOpts }[];

type LobbyChannel = {
  start(): void;
  registerEventHandler(event: LobbySocketEvent, handler: (socket: SocketIO.Socket) => (...args: any[]) => void): void;
};
type Host = {
  http: Server;
  io: SocketIO.Server;
  channel: LobbyChannel;
  port: number;
  hostTag: ServerHostTag;
  checkRoomExist: jest.Mock<boolean, [number]>;
};

function bounded<T>(promise: Promise<T>, description: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${description}`)), 3000);
    promise.then(
      result => {
        clearTimeout(timer);
        resolve(result);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function nextEvent(socket: SocketIO.Socket | SocketIOClient.Socket, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const listener = () => {
      clearTimeout(timer);
      socket.removeListener(event, listener);
      resolve();
    };
    const timer = setTimeout(() => {
      socket.removeListener(event, listener);
      reject(new Error(`Timed out waiting for socket ${event}`));
    }, 3000);
    socket.on(event, listener);
  });
}

function inbox<T>() {
  const values: T[] = [];
  const readers: ((value: T) => void)[] = [];
  return {
    push: (value: T) => {
      const reader = readers.shift();
      if (reader) {
        reader(value);
      } else {
        values.push(value);
      }
    },
    take: () =>
      bounded(
        values.length ? Promise.resolve(values.shift()!) : new Promise<T>(resolve => readers.push(resolve)),
        'request or callback',
      ),
  };
}

describe.each(['polling' as const, 'websocket' as const])(
  'RealConnectionService over real Socket.IO 2 %s',
  transport => {
    let hosts: Host[];
    let services: RealConnectionService[];

    beforeEach(() => {
      mockTransport = transport;
      mockClients = [];
      hosts = [];
      services = [];
    });

    afterEach(async () => {
      services.forEach(service => service.close());
      // Also close captured clients if an assertion failed before the service could own them.
      mockClients.forEach(({ socket }) => socket.close());
      await Promise.all(
        hosts.map(host => bounded(new Promise<void>(resolve => host.io.close(() => resolve())), 'server shutdown')),
      );
    });

    async function startHost(hostTag = ServerHostTag.Localhost): Promise<Host> {
      const http = createServer();
      const io = createSocketServer(http, { transports: [transport] });
      const checkRoomExist = jest.fn((id: number) => id === 17);
      const channel: LobbyChannel = new LobbyEventChannel({ checkRoomExist }, io, {});
      const host = { http, io, channel, hostTag, checkRoomExist, port: 0 };
      hosts.push(host);
      channel.start();
      await bounded(
        new Promise<void>((resolve, reject) => {
          http.once('error', reject);
          http.listen(0, '127.0.0.1', () => {
            http.removeListener('error', reject);
            resolve();
          });
        }),
        'ephemeral listener',
      );
      host.port = (http.address() as AddressInfo).port;
      return host;
    }

    async function connect(serverHosts: Host[], timeout = 2000) {
      const config = {
        host: serverHosts.map(({ port, hostTag }) => ({ protocol: 'http', host: '127.0.0.1', port, hostTag })),
      } as ClientConfig;
      const service = new RealConnectionService(config, timeout);
      services.push(service);
      const shared = mockClients.filter(client => !client.options?.forceNew);
      await Promise.all(
        shared.map(({ socket }) => (socket.connected ? Promise.resolve() : nextEvent(socket, 'connect'))),
      );
      return { service, shared };
    }

    function requests() {
      return mockClients.filter(client => client.options?.forceNew);
    }

    function expectReleased(shared: typeof mockClients) {
      requests().forEach(({ socket, options }) => {
        expect(options).toMatchObject({ forceNew: true, reconnection: false });
        expect(socket.connected).toBe(false);
        expect((socket.io as unknown as { readyState: string }).readyState).toBe('closed');
      });
      shared.forEach(({ socket }) => expect(socket.connected).toBe(true));
    }

    function controlled(host: Host, event: LobbySocketEvent) {
      const received = inbox<{ socket: SocketIO.Socket; payload: any }>();
      host.channel.registerEventHandler(event, socket => payload => received.push({ socket, payload }));
      return received;
    }

    test('production lobby answers QueryVersion and true/false room checks without closing shared sockets', async () => {
      const host = await startHost();
      const { service, shared } = await connect([host]);
      const versions = inbox<VersionCheckListenerResponse>();
      service.Lobby.checkCoreVersion(versions.push);
      expect(await versions.take()).toEqual({ packet: true, hostTag: host.hostTag, ping: expect.any(Number) });
      const rooms = inbox<{ exist: boolean; ping: number }>();
      service.Lobby.checkRoomExist(host.hostTag, 17, (exist, ping) => rooms.push({ exist, ping }));
      expect(await rooms.take()).toEqual({ exist: true, ping: expect.any(Number) });
      service.Lobby.checkRoomExist(host.hostTag, 18, (exist, ping) => rooms.push({ exist, ping }));
      expect(await rooms.take()).toEqual({ exist: false, ping: expect.any(Number) });
      expect(host.checkRoomExist.mock.calls).toEqual([[17], [18]]);
      expect(requests()).toHaveLength(3);
      expectReleased(shared);
      // A real shared-socket round trip remains usable after all request managers disconnect.
      const ping = inbox<number>();
      service.Lobby.ping(host.hostTag, ping.push);
      expect(await ping.take()).toBeGreaterThanOrEqual(0);
    });

    test('same-host overlapping room and version checks retain ownership when replies arrive in reverse order', async () => {
      const host = await startHost();
      const rooms = controlled(host, LobbySocketEvent.CheckRoomExist);
      const versions = controlled(host, LobbySocketEvent.QueryVersion);
      const { service, shared } = await connect([host]);
      const firstRoom = jest.fn();
      const secondRoom = jest.fn();
      const firstVersion = jest.fn();
      const secondVersion = jest.fn();
      const completed = inbox<string>();
      service.Lobby.checkRoomExist(host.hostTag, 11, (...args) => {
        firstRoom(...args);
        completed.push('first room');
      });
      const a = await rooms.take();
      service.Lobby.checkRoomExist(host.hostTag, 22, (...args) => {
        secondRoom(...args);
        completed.push('second room');
      });
      const b = await rooms.take();
      service.Lobby.checkCoreVersion(response => {
        firstVersion(response);
        completed.push('first version');
      });
      const c = await versions.take();
      service.Lobby.checkCoreVersion(response => {
        secondVersion(response);
        completed.push('second version');
      });
      const d = await versions.take();
      expect([a.payload, b.payload]).toEqual([11, 22]);
      expect([c.payload, d.payload]).toEqual([{ version: 'integration-version' }, { version: 'integration-version' }]);
      expect(new Set([a, b, c, d].map(request => request.socket.id)).size).toBe(4);
      b.socket.emit(roomEvent, false);
      expect(await completed.take()).toBe('second room');
      d.socket.emit(versionEvent, false);
      expect(await completed.take()).toBe('second version');
      expect(firstRoom).not.toHaveBeenCalled();
      expect(firstVersion).not.toHaveBeenCalled();
      a.socket.emit(roomEvent, true);
      expect(await completed.take()).toBe('first room');
      c.socket.emit(versionEvent, true);
      expect(await completed.take()).toBe('first version');
      expect(firstRoom).toHaveBeenCalledWith(true, expect.any(Number));
      expect(secondRoom).toHaveBeenCalledWith(false, expect.any(Number));
      expect(firstVersion).toHaveBeenCalledWith({ packet: true, hostTag: host.hostTag, ping: expect.any(Number) });
      expect(secondVersion).toHaveBeenCalledWith({ packet: false, hostTag: host.hostTag, ping: expect.any(Number) });
      [firstRoom, secondRoom, firstVersion, secondVersion].forEach(callback =>
        expect(callback).toHaveBeenCalledTimes(1),
      );
      expectReleased(shared);
    });

    test('different hosts deliver independent room and version responses', async () => {
      const a = await startHost();
      const b = await startHost(ServerHostTag.ShenZhen);
      const aRooms = controlled(a, LobbySocketEvent.CheckRoomExist);
      const bRooms = controlled(b, LobbySocketEvent.CheckRoomExist);
      const aVersions = controlled(a, LobbySocketEvent.QueryVersion);
      const bVersions = controlled(b, LobbySocketEvent.QueryVersion);
      const { service, shared } = await connect([a, b]);
      const first = jest.fn();
      const second = jest.fn();
      const completed = inbox<string>();
      service.Lobby.checkRoomExist(a.hostTag, 11, (...args) => {
        first(...args);
        completed.push('a');
      });
      service.Lobby.checkRoomExist(b.hostTag, 22, (...args) => {
        second(...args);
        completed.push('b');
      });
      const ar = await aRooms.take();
      const br = await bRooms.take();
      br.socket.emit(roomEvent, false);
      expect(await completed.take()).toBe('b');
      expect(first).not.toHaveBeenCalled();
      ar.socket.emit(roomEvent, true);
      expect(await completed.take()).toBe('a');
      expect(first).toHaveBeenCalledWith(true, expect.any(Number));
      expect(second).toHaveBeenCalledWith(false, expect.any(Number));
      const versions = inbox<VersionCheckListenerResponse>();
      service.Lobby.checkCoreVersion(versions.push);
      const av = await aVersions.take();
      const bv = await bVersions.take();
      bv.socket.emit(versionEvent, false);
      expect(await versions.take()).toEqual({ packet: false, hostTag: b.hostTag, ping: expect.any(Number) });
      av.socket.emit(versionEvent, true);
      expect(await versions.take()).toEqual({ packet: true, hostTag: a.hostTag, ping: expect.any(Number) });
      expectReleased(shared);
    });

    test('timeout is silent and a late old response cannot complete a fresh request', async () => {
      const host = await startHost();
      const rooms = controlled(host, LobbySocketEvent.CheckRoomExist);
      const { service, shared } = await connect([host], 500);
      const expired = jest.fn();
      service.Lobby.checkRoomExist(host.hostTag, 11, expired);
      const old = await rooms.take();
      await nextEvent(old.socket, 'disconnect');
      expect(expired).not.toHaveBeenCalled();
      expectReleased(shared);
      const result = inbox<boolean>();
      const fresh = jest.fn((exist: boolean) => result.push(exist));
      service.Lobby.checkRoomExist(host.hostTag, 22, fresh);
      const current = await rooms.take();
      old.socket.emit(roomEvent, false);
      current.socket.emit(roomEvent, true);
      expect(await result.take()).toBe(true);
      expect(expired).not.toHaveBeenCalled();
      expect(fresh).toHaveBeenCalledTimes(1);
      expectReleased(shared);
    });

    test('close cancels pending requests, suppresses late replies and remains terminal', async () => {
      const host = await startHost();
      const rooms = controlled(host, LobbySocketEvent.CheckRoomExist);
      const versions = controlled(host, LobbySocketEvent.QueryVersion);
      const { service } = await connect([host]);
      const room = jest.fn();
      const version = jest.fn();
      service.Lobby.checkRoomExist(host.hostTag, 11, room);
      service.Lobby.checkCoreVersion(version);
      const a = await rooms.take();
      const b = await versions.take();
      const disconnected = [nextEvent(a.socket, 'disconnect'), nextEvent(b.socket, 'disconnect')];
      service.close();
      a.socket.emit(roomEvent, false);
      b.socket.emit(versionEvent, false);
      await Promise.all(disconnected);
      const count = mockClients.length;
      service.Lobby.checkRoomExist(host.hostTag, 22, room);
      service.Lobby.checkCoreVersion(version);
      service.close();
      expect(mockClients).toHaveLength(count);
      mockClients.forEach(({ socket }) => expect(socket.connected).toBe(false));
      expect(room).not.toHaveBeenCalled();
      expect(version).not.toHaveBeenCalled();
    });
  },
);
