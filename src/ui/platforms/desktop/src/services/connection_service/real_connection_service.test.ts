/** @jest-environment node */
import { Sanguosha } from 'core/game/engine';
import { TemporaryRoomCreationInfo } from 'core/game/game_props';
import { ChatSocketEvent, LobbySocketEvent } from 'core/shares/types/server_types';
import { ClientConfig, ServerHostTag } from 'props/config_props';
import SocketIOClient from 'socket.io-client';
import { RealConnectionService } from './real_connection_service';

jest.mock('socket.io-client', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'unit-test-version' } }));

// Socket.IO 2 overloads also accept options alone; exercise the URI overload explicitly.
const socketFactory = SocketIOClient as unknown as jest.Mock<
  SocketIOClient.Socket,
  [uri: string, options?: SocketIOClient.ConnectOpts]
>;
type Receiver = (...args: any[]) => void;
const roomEvent = LobbySocketEvent.CheckRoomExist.toString();
const versionEvent = LobbySocketEvent.VersionMismatch.toString();
const queryVersionEvent = LobbySocketEvent.QueryVersion.toString();
const hosts = [ServerHostTag.Localhost, ServerHostTag.ShenZhen];
const config = {
  host: [
    { protocol: 'http', host: 'first.test', port: 3000, hostTag: hosts[0] },
    { protocol: 'https', host: 'second.test', port: 4000, hostTag: hosts[1] },
  ],
} as ClientConfig;

function createSocket() {
  const listeners = new Map<string, Set<Receiver>>();
  const socket = {
    on: jest.fn((event: string, receiver: Receiver) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(receiver);
      return socket;
    }),
    once: jest.fn((event: string, receiver: Receiver) => {
      const wrapped: Receiver = (...args) => {
        socket.removeListener(event, wrapped);
        receiver(...args);
      };
      socket.on(event, wrapped);
      return socket;
    }),
    removeListener: jest.fn((event: string, receiver: Receiver) => {
      listeners.get(event)?.delete(receiver);
      return socket;
    }),
    off: jest.fn((event: string, receiver: Receiver) => socket.removeListener(event, receiver)),
    removeAllListeners: jest.fn((event?: string) => {
      if (event === undefined) {
        listeners.clear();
      } else {
        listeners.delete(event);
      }
      return socket;
    }),
    connect: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    close: jest.fn(),
    fire: (event: string, ...args: any[]) => {
      for (const receiver of Array.from(listeners.get(event) || [])) {
        receiver(...args);
      }
    },
    capture: (event: string) => Array.from(listeners.get(event) || []),
    listenerCount: () => Array.from(listeners.values()).reduce((total, receivers) => total + receivers.size, 0),
  };
  return socket;
}

type MockSocket = ReturnType<typeof createSocket>;
type SocketCall = { uri: string; options?: SocketIOClient.ConnectOpts; socket: MockSocket };

describe('RealConnectionService request ownership', () => {
  let calls: SocketCall[];
  let service: RealConnectionService;
  let now: number;

  const requests = () => calls.filter(call => call.options?.forceNew);
  const requestSocket = (index = requests().length - 1) => requests()[index].socket;
  const sharedSockets = () => calls.filter(call => !call.options?.forceNew).map(call => call.socket);
  const connect = (socket: MockSocket) => socket.fire('connect');
  const expectReleased = (socket: MockSocket) => {
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.listenerCount()).toBe(0);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    calls = [];
    socketFactory.mockImplementation((uri, options) => {
      const socket = createSocket();
      calls.push({ uri, options, socket });
      return socket as unknown as SocketIOClient.Socket;
    });
    service = new RealConnectionService(config, 100);
  });

  afterEach(() => {
    service.close();
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  test('allocates a non-reconnecting /lobby socket per request and emits the unchanged room id only after connect', () => {
    const callback = jest.fn();
    const shared = sharedSockets();
    service.Lobby.checkRoomExist(hosts[0], 17, callback);
    const request = requests()[0];
    expect(request.uri).toBe('http://first.test:3000/lobby');
    expect(request.options).toEqual({ autoConnect: false, forceNew: true, reconnection: false });
    expect(request.socket.capture(roomEvent)).toHaveLength(1);
    expect(request.socket.connect).toHaveBeenCalledTimes(1);
    expect(request.socket.emit).not.toHaveBeenCalled();
    connect(request.socket);
    expect(request.socket.emit.mock.calls).toEqual([[roomEvent, 17]]);
    request.socket.fire(roomEvent, true);
    expect(callback).toHaveBeenCalledWith(true, 0);
    expectReleased(request.socket);
    shared.forEach(socket => {
      expect(socket.emit).not.toHaveBeenCalled();
      expect(socket.close).not.toHaveBeenCalled();
      expect(socket.disconnect).not.toHaveBeenCalled();
    });
  });

  test('same-host replies in reverse order keep their callbacks and independent ping clocks', () => {
    const first = jest.fn();
    const second = jest.fn();
    service.Lobby.checkRoomExist(hosts[0], 11, first);
    const firstSocket = requestSocket();
    connect(firstSocket);
    now = 1020;
    service.Lobby.checkRoomExist(hosts[0], 22, second);
    const secondSocket = requestSocket();
    connect(secondSocket);
    expect(firstSocket).not.toBe(secondSocket);
    now = 1030;
    // An unrelated operation must not reset either request's clock.
    service.Lobby.getRoomList(jest.fn());
    now = 1060;
    secondSocket.fire(roomEvent, false);
    expect(second).toHaveBeenCalledWith(false, 20);
    expect(first).not.toHaveBeenCalled();
    now = 1080;
    firstSocket.fire(roomEvent, true);
    expect(first).toHaveBeenCalledWith(true, 40);
    expectReleased(firstSocket);
    expectReleased(secondSocket);
  });

  test('different-host replies cannot notify a sibling request or a shared lobby listener', () => {
    const first = jest.fn();
    const second = jest.fn();
    service.Lobby.checkRoomExist(hosts[0], 11, first);
    service.Lobby.checkRoomExist(hosts[1], 22, second);
    const [a, b] = requests();
    expect(b.uri).toBe('https://second.test:4000/lobby');
    connect(a.socket);
    connect(b.socket);
    sharedSockets().forEach(socket => socket.fire(roomEvent, false));
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    b.socket.fire(roomEvent, false);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    a.socket.fire(roomEvent, true);
    expect(first).toHaveBeenCalledWith(true, 0);
    expect(second).toHaveBeenCalledWith(false, 0);
  });

  test.each(['room', 'version'])('%s ignores non-boolean packets until a valid response arrives', kind => {
    const callback = jest.fn();
    if (kind === 'room') {
      service.Lobby.checkRoomExist(hosts[0], 11, callback);
    } else {
      service.Lobby.checkCoreVersion(callback);
    }
    const socket = requestSocket(0);
    const event = kind === 'room' ? roomEvent : versionEvent;
    connect(socket);
    [undefined, null, 0, 1, 'false', {}, { exist: false }, { packet: true }].forEach(packet =>
      socket.fire(event, packet),
    );
    expect(callback).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
    socket.fire(event, false);
    expect(callback).toHaveBeenCalledTimes(1);
    if (kind === 'room') {
      expect(callback).toHaveBeenCalledWith(false, 0);
    } else {
      expect(callback).toHaveBeenCalledWith({ packet: false, hostTag: hosts[0], ping: 0 });
    }
    expectReleased(socket);
  });

  test('completion releases resources before callback, and duplicate or captured stale handlers are harmless', () => {
    const callback = jest.fn(() => {
      expectReleased(requestSocket());
      expect(jest.getTimerCount()).toBe(0);
    });
    service.Lobby.checkRoomExist(hosts[0], 11, callback);
    const socket = requestSocket();
    const capturedReply = socket.capture(roomEvent);
    const capturedConnect = socket.capture('connect');
    connect(socket);
    socket.fire(roomEvent, true);
    socket.fire(roomEvent, false);
    capturedReply.forEach(receiver => receiver(false));
    capturedConnect.forEach(receiver => receiver());
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expectReleased(socket);
  });

  test.each(['room', 'version'])(
    '%s handles synchronous connect and zero-latency response without a leaked timer',
    kind => {
      service.close();
      service = new RealConnectionService({ ...config, host: config.host.slice(0, 1) }, 100);
      let socket: MockSocket;
      socketFactory.mockImplementationOnce((uri, options) => {
        socket = createSocket();
        calls.push({ uri, options, socket });
        socket.connect.mockImplementation(() => socket.fire('connect'));
        socket.emit.mockImplementation(() => socket.fire(kind === 'room' ? roomEvent : versionEvent, true));
        return socket as unknown as SocketIOClient.Socket;
      });
      const callback = jest.fn(() => {
        expectReleased(socket);
        expect(jest.getTimerCount()).toBe(0);
      });
      if (kind === 'room') {
        service.Lobby.checkRoomExist(hosts[0], 11, callback);
        expect(callback).toHaveBeenCalledWith(true, 0);
      } else {
        service.Lobby.checkCoreVersion(callback);
        expect(callback).toHaveBeenCalledWith({ packet: true, hostTag: hosts[0], ping: 0 });
      }
      expect(callback).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
    },
  );

  test('version completion cleans up before notifying and rejects duplicate captured replies', () => {
    service.close();
    service = new RealConnectionService({ ...config, host: config.host.slice(0, 1) }, 100);
    const callback = jest.fn(() => {
      expectReleased(requestSocket());
      expect(jest.getTimerCount()).toBe(0);
    });
    service.Lobby.checkCoreVersion(callback);
    const socket = requestSocket();
    const replies = socket.capture(versionEvent);
    const connects = socket.capture('connect');
    connect(socket);
    socket.fire(versionEvent, false);
    replies.forEach(receiver => receiver(true));
    connects.forEach(receiver => receiver());
    socket.fire(versionEvent, true);
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ packet: false, hostTag: hosts[0], ping: 0 });
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expectReleased(socket);
  });

  test('version requests use QueryVersion with the engine version and isolate overlapping checks on every host', () => {
    const first = jest.fn();
    const second = jest.fn();
    service.Lobby.checkCoreVersion(first);
    now = 1020;
    service.Lobby.checkCoreVersion(second);
    expect(requests()).toHaveLength(4);
    requests().forEach(({ socket, options }) => {
      expect(options).toEqual({ autoConnect: false, forceNew: true, reconnection: false });
      expect(socket.capture(versionEvent)).toHaveLength(1);
      expect(socket.emit).not.toHaveBeenCalled();
      connect(socket);
      expect(socket.emit.mock.calls).toEqual([[queryVersionEvent, { version: Sanguosha.Version }]]);
    });
    sharedSockets().forEach(socket => socket.fire(versionEvent, true));
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    now = 1060;
    requestSocket(3).fire(versionEvent, false);
    expect(second).toHaveBeenLastCalledWith({ packet: false, hostTag: hosts[1], ping: 20 });
    requestSocket(0).fire(versionEvent, true);
    expect(first).toHaveBeenLastCalledWith({ packet: true, hostTag: hosts[0], ping: 30 });
    requestSocket(2).fire(versionEvent, true);
    requestSocket(1).fire(versionEvent, false);
    expect(second.mock.calls).toEqual([
      [{ packet: false, hostTag: hosts[1], ping: 20 }],
      [{ packet: true, hostTag: hosts[0], ping: 20 }],
    ]);
    expect(first.mock.calls).toEqual([
      [{ packet: true, hostTag: hosts[0], ping: 30 }],
      [{ packet: false, hostTag: hosts[1], ping: 30 }],
    ]);
    requests().forEach(({ socket }) => expectReleased(socket));
  });

  test.each(['room', 'version'])('%s timeout cancels silently, including responses captured before timeout', kind => {
    const callback = jest.fn();
    if (kind === 'room') {
      service.Lobby.checkRoomExist(hosts[0], 11, callback);
    } else {
      service.Lobby.checkCoreVersion(callback);
    }
    expect(requests()).toHaveLength(kind === 'room' ? 1 : 2);
    const captured = requests().map(({ socket }) => {
      connect(socket);
      return socket.capture(kind === 'room' ? roomEvent : versionEvent);
    });
    jest.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();
    requests().forEach(({ socket }) => expect(socket.disconnect).not.toHaveBeenCalled());
    jest.advanceTimersByTime(1);
    requests().forEach(({ socket }) => expectReleased(socket));
    captured.flat().forEach(receiver => receiver(false));
    expect(callback).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('the default request deadline is ten seconds even if the socket never connects', () => {
    service.close();
    service = new RealConnectionService(config);
    const callback = jest.fn();
    service.Lobby.checkRoomExist(hosts[0], 11, callback);
    const socket = requestSocket();
    jest.advanceTimersByTime(9999);
    expect(socket.disconnect).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expectReleased(socket);
    expect(socket.emit).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  test.each(['connect_error', 'error', 'disconnect'])(
    '%s cancels room and version requests without false callbacks',
    event => {
      const roomCallback = jest.fn();
      const versionCallback = jest.fn();
      service.Lobby.checkRoomExist(hosts[0], 11, roomCallback);
      service.Lobby.checkCoreVersion(versionCallback);
      expect(requests()).toHaveLength(3);
      requests().forEach(({ socket }, index) => {
        const replies = socket.capture(index === 0 ? roomEvent : versionEvent);
        const connects = socket.capture('connect');
        // connect_error occurs before connection; other failures happen after emission.
        if (event !== 'connect_error') {
          connect(socket);
        }
        const emissions = socket.emit.mock.calls.length;
        socket.fire(event, new Error('unavailable'));
        expectReleased(socket);
        replies.forEach(receiver => receiver(false));
        connects.forEach(receiver => receiver());
        expect(socket.emit).toHaveBeenCalledTimes(emissions);
      });
      jest.advanceTimersByTime(1000);
      expect(roomCallback).not.toHaveBeenCalled();
      expect(versionCallback).not.toHaveBeenCalled();
    },
  );

  test('close cancels all requests and shared listeners exactly once, including captured callbacks', () => {
    const roomCallback = jest.fn();
    const versionCallback = jest.fn();
    const roomListCallback = jest.fn();
    const pingCallback = jest.fn();
    const chatCallback = jest.fn();
    service.Lobby.checkRoomExist(hosts[0], 11, roomCallback);
    service.Lobby.checkCoreVersion(versionCallback);
    expect(requests()).toHaveLength(3);
    service.Lobby.getRoomList(roomListCallback);
    service.Lobby.ping(hosts[0], pingCallback);
    service.Chat.received(chatCallback);
    const captured = calls.flatMap(({ socket }) => socket.on.mock.calls.map(([, receiver]) => receiver));
    service.close();
    service.close();
    requests().forEach(({ socket }) => expectReleased(socket));
    sharedSockets().forEach(socket => {
      expect(socket.close.mock.calls.length + socket.disconnect.mock.calls.length).toBe(1);
      expect(socket.listenerCount()).toBe(0);
    });
    captured.forEach(receiver => receiver(false));
    jest.advanceTimersByTime(1000);
    [roomCallback, versionCallback, roomListCallback, pingCallback, chatCallback].forEach(callback =>
      expect(callback).not.toHaveBeenCalled(),
    );
  });

  test('all API operations are inert after close', async () => {
    service.close();
    const factoryCalls = socketFactory.mock.calls.length;
    const snapshots = calls.map(({ socket }) => ({
      socket,
      on: socket.on.mock.calls.length,
      emit: socket.emit.mock.calls.length,
      connect: socket.connect.mock.calls.length,
    }));
    const callback = jest.fn();
    const gameInfo = {} as TemporaryRoomCreationInfo;
    service.Lobby.checkRoomExist(hosts[0], 11, callback);
    service.Lobby.checkCoreVersion(callback);
    service.Lobby.getRoomList(callback);
    service.Lobby.ping(hosts[0], callback);
    service.Lobby.createWaitingRoom(gameInfo, callback);
    service.Lobby.createGame({ ...gameInfo, cardExtensions: [] }, callback);
    service.Chat.send('message', 'player');
    service.Chat.received(callback);
    service.Chat.disconnect();
    expect(service.Chat.chatHistory()).toEqual([]);
    await Promise.resolve();
    expect(socketFactory).toHaveBeenCalledTimes(factoryCalls);
    snapshots.forEach(({ socket, on, emit, connect: connectCount }) => {
      expect(socket.on).toHaveBeenCalledTimes(on);
      expect(socket.emit).toHaveBeenCalledTimes(emit);
      expect(socket.connect).toHaveBeenCalledTimes(connectCount);
    });
    expect(callback).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('close between a host ping and pending create continuations prevents late emits and listeners', async () => {
    const callback = jest.fn();
    const gameInfo = {} as TemporaryRoomCreationInfo;
    service.Lobby.createWaitingRoom(gameInfo, callback);
    service.Lobby.createGame({ ...gameInfo, cardExtensions: [] }, callback);
    const lobby = calls.find(call => call.uri === 'http://first.test:3000/lobby')!.socket;
    lobby.fire(LobbySocketEvent.PingServer.toString());
    service.close();
    const emissions = lobby.emit.mock.calls.length;
    const registrations = lobby.on.mock.calls.length;
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(lobby.emit).toHaveBeenCalledTimes(emissions);
    expect(lobby.on).toHaveBeenCalledTimes(registrations);
    expect(callback).not.toHaveBeenCalled();
  });

  test('room lists, ping, and chat continue using the existing shared sockets while open', () => {
    const roomList = jest.fn();
    const ping = jest.fn();
    const chat = jest.fn();
    const lobby = calls.find(call => call.uri === 'http://first.test:3000/lobby')!.socket;
    const chatSocket = calls.find(call => call.uri === 'http://first.test:3000/chat')!.socket;
    service.Lobby.getRoomList(roomList);
    expect(lobby.emit).toHaveBeenCalledWith(LobbySocketEvent.QueryRoomList.toString());
    now = 1040;
    lobby.fire(LobbySocketEvent.QueryRoomList.toString(), []);
    expect(roomList).toHaveBeenCalledWith({ packet: [], hostTag: hosts[0], ping: 20 });
    service.Lobby.ping(hosts[0], ping);
    now = 1060;
    lobby.fire(LobbySocketEvent.PingServer.toString());
    expect(ping).toHaveBeenCalledWith(10);
    service.Chat.send('hello', 'player');
    expect(chatSocket.emit).toHaveBeenCalledWith(ChatSocketEvent.Chat, {
      message: 'hello',
      from: 'player',
      timestamp: 1060,
    });
    service.Chat.received(chat);
    const packet = { message: 'reply', from: 'other', timestamp: 1060 };
    chatSocket.fire(ChatSocketEvent.Chat, packet);
    expect(chat).toHaveBeenCalledWith(packet);
    expect(service.Chat.chatHistory()).toEqual([packet]);
    expect(requests()).toHaveLength(0);
  });
});
