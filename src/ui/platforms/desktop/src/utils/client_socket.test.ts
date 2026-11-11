/** @jest-environment node */
import { GameEventIdentifiers } from 'core/event/event';
import { ClientSocket } from 'core/network/socket.client';
import IOSocketClient, { Manager } from 'socket.io-client';
import { createServer } from 'http';

jest.mock('socket.io-client', () => ({ __esModule: true, default: jest.fn(), Manager: jest.fn() }));

// These tests exercise the URI overload; MockedFunction otherwise selects the final options-only overload.
const socketFactory = IOSocketClient as unknown as jest.Mock<
  SocketIOClient.Socket,
  [uri: string, options?: SocketIOClient.ConnectOpts]
>;
const event = GameEventIdentifiers.PlayerLeaveEvent;

function createSocket() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const socket = {
    on: jest.fn((name: string, receiver: (...args: any[]) => void) => {
      if (!listeners.has(name)) {
        listeners.set(name, new Set());
      }
      listeners.get(name)!.add(receiver);
      return socket;
    }),
    removeListener: jest.fn((name: string, receiver: (...args: any[]) => void) => {
      listeners.get(name)?.delete(receiver);
      return socket;
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    close: jest.fn(),
    fire: (name: string, ...args: any[]) => {
      for (const receiver of Array.from(listeners.get(name) || [])) {
        receiver(...args);
      }
    },
    listeners,
  };
  return socket;
}

describe('ClientSocket ownership', () => {
  let socket: ReturnType<typeof createSocket>;

  beforeEach(() => {
    socket = createSocket();
    socketFactory.mockReturnValue(socket as unknown as SocketIOClient.Socket);
  });

  test('creates only one namespace socket with bounded reconnect options', () => {
    const client = new ClientSocket('http://localhost/room', 'room');

    expect(socketFactory).toHaveBeenCalledTimes(1);
    expect(socketFactory).toHaveBeenCalledWith('http://localhost/room', {
      reconnection: true,
      reconnectionAttempts: 3,
      timeout: 60000,
    });
    expect(Manager).not.toHaveBeenCalled();
    client.disconnect();
  });

  test('notifies every reconnect subscriber once, after reconnect then connect, never on initial connect', () => {
    const client = new ClientSocket('http://localhost/room', 'room');
    const first = jest.fn();
    const second = jest.fn();
    client.onReconnected(first);
    client.onReconnected(second);

    socket.fire('connect');
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    for (let attempt = 1; attempt <= 2; attempt++) {
      socket.fire('reconnect', attempt);
      expect(first).toHaveBeenCalledTimes(attempt - 1);
      socket.fire('connect');
      socket.fire('connect');
      expect(first).toHaveBeenCalledTimes(attempt);
      expect(second).toHaveBeenCalledTimes(attempt);
    }
    client.disconnect();
  });

  test('removes only owned listeners and disconnects only once; disposed clients cannot register or notify', () => {
    const client = new ClientSocket('http://localhost/room', 'room');
    const receiver = jest.fn();
    const reconnected = jest.fn();
    const externalReceiver = jest.fn();
    socket.on(event.toString(), externalReceiver);
    expect(client.on(event, receiver)).toBe(client);
    client.onReconnected(reconnected);
    const content = { playerId: 'player' } as any;
    client.notify(event, content);
    expect(socket.emit).toHaveBeenCalledWith(event.toString(), content);
    socket.fire(event.toString(), content);
    expect(receiver).toHaveBeenCalledTimes(1);
    const captured = socket.on.mock.calls.map(([, callback]) => callback);

    socket.fire('reconnect');
    client.disconnect();
    client.disconnect();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.close).not.toHaveBeenCalled();
    expect(socket.removeListener).toHaveBeenCalledTimes(3);
    expect(socket.listeners.get(event.toString())).toEqual(new Set([externalReceiver]));
    const registrationCount = socket.on.mock.calls.length;
    client.on(event, receiver);
    client.onReconnected(reconnected);
    client.notify(event, content);
    socket.fire('connect');
    socket.fire('reconnect');
    socket.fire(event.toString(), content);
    // A listener already captured by an in-progress dispatch must also be harmless.
    captured.forEach(callback => callback(content));
    expect(socket.on).toHaveBeenCalledTimes(registrationCount);
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(receiver).toHaveBeenCalledTimes(1);
    expect(reconnected).not.toHaveBeenCalled();
    expect(externalReceiver).toHaveBeenCalled();
  });

  test('disposal from a reconnect callback prevents remaining owned callbacks', () => {
    const client = new ClientSocket('http://localhost/room', 'room');
    const callback = jest.fn();
    client.onReconnected(() => client.disconnect());
    client.onReconnected(callback);
    socket.fire('reconnect');
    socket.fire('connect');
    expect(callback).not.toHaveBeenCalled();
  });
});

// Use the existing server dependency directly: no game engine or production server is started.
describe('ClientSocket with the real Socket.IO 2 server', () => {
  const realClient = jest.requireActual('socket.io-client');
  const createIOServer = jest.requireActual('../../../../../server/node_modules/socket.io');
  let io: SocketIO.Server;
  let client: ClientSocket | undefined;
  let sibling: SocketIOClient.Socket | undefined;

  afterEach(async () => {
    client?.disconnect();
    sibling?.disconnect();
    if (io) {
      await new Promise<void>(resolve => io.close(() => resolve()));
    }
  });

  function once(emitter: { once: (name: string, listener: (...args: any[]) => void) => any }, name: string) {
    return new Promise<any>(resolve => emitter.once(name, resolve));
  }

  test.each(['polling', 'websocket'])(
    'immediate leave then disconnect drains the last %s transport',
    async transport => {
      const httpServer = createServer();
      io = createIOServer(httpServer);
      const connected = once(io.of('/owned'), 'connection');
      await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
      const address = httpServer.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected an ephemeral TCP port');
      }
      let owned: SocketIOClient.Socket;
      socketFactory.mockImplementation((uri, options) => {
        owned = realClient(uri, { ...options, transports: [transport] });
        return owned;
      });
      client = new ClientSocket(`http://127.0.0.1:${address.port}/owned`, 'room');
      const serverOwned = await connected;
      if (!owned!.connected) {
        await once(owned!, 'connect');
      }
      const receivedLeave = once(serverOwned, event.toString());
      const ownedLeft = once(serverOwned, 'disconnect');
      const content = { playerId: 'player' } as any;
      client.notify(event, content);
      client.disconnect();
      expect(await receivedLeave).toEqual(content);
      await ownedLeft;
      expect(owned!.connected).toBe(false);
      expect(Object.keys(io.of('/owned').connected)).toHaveLength(0);
    },
  );

  test('immediate leave then disconnect reaches the server and preserves a sibling on the same manager', async () => {
    const httpServer = createServer();
    io = createIOServer(httpServer);
    const ownedConnected = once(io.of('/owned'), 'connection');
    const siblingConnected = once(io.of('/sibling'), 'connection');
    await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected an ephemeral TCP port');
    }
    const endpoint = `http://127.0.0.1:${address.port}`;
    const namespaceSockets: SocketIOClient.Socket[] = [];
    socketFactory.mockImplementation((uri, options) => {
      const socket = realClient(uri, options);
      namespaceSockets.push(socket);
      return socket;
    });
    client = new ClientSocket(`${endpoint}/owned`, 'room');
    sibling = realClient(`${endpoint}/sibling`);
    const serverOwned = await ownedConnected;
    const serverSibling = await siblingConnected;
    const owned = namespaceSockets[0];
    if (!owned.connected) {
      await once(owned, 'connect');
    }
    if (!sibling!.connected) {
      await once(sibling!, 'connect');
    }
    expect(owned.io).toBe(sibling!.io);
    const receivedLeave = once(serverOwned, event.toString());
    const ownedLeft = once(serverOwned, 'disconnect');
    const content = { playerId: 'player' } as any;
    client.notify(event, content);
    client.disconnect();
    expect(await receivedLeave).toEqual(content);
    await ownedLeft;
    expect(owned.connected).toBe(false);
    expect(sibling!.connected).toBe(true);
    expect(Object.keys(io.of('/owned').connected)).toHaveLength(0);
    serverSibling.on('still-alive', (ack: (value: string) => void) => ack('yes'));
    const reply = await new Promise(resolve => sibling!.emit('still-alive', resolve));
    expect(reply).toBe('yes');
  });
});
