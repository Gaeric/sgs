import { activeWaitingRoomListeningEvents, WaitingRoomEvent } from 'core/event/event';
import type { GameInfo, TemporaryRoomCreationInfo } from 'core/game/game_props';
import type { RoomId } from 'core/room/room';
import { Logger } from 'core/shares/libs/logger/logger';
import { Languages } from 'core/translations/translation_json_tool';
import { ElectronData } from 'electron_loader/electron_data';
import { ClientFlavor, ServerHostTag } from 'props/config_props';
import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import IOSocketClient from 'socket.io-client';
import { installAudioPlayerService } from 'ui/audio/install';
import { GameSettings } from './game_settings/game_settings';
import { Seats } from './seats/seats';
import { RoomAvatarService } from './services/avatar_service';
import { WaitingRoomSender } from './services/sender_service';
import { WaitingRoom } from './waiting_room';
import { WaitingRoomPresenter } from './waiting_room.presenter';
import { WaitingRoomProcessor } from './waiting_room_processor';

// Keep the processor, sender, presenter and store real; isolate browser/engine resources.
jest.mock('core/game/engine', () => ({
  Sanguosha: {
    Version: 'test-version',
    getAllCharacters: () => [{ Name: 'test-avatar' }],
    getCardExtensionsFromGameMode: () => [],
    getGameCharacterExtensions: () => [],
  },
}));
jest.mock('socket.io-client', () => jest.fn());
jest.mock('ui/audio/install', () => ({ installAudioPlayerService: jest.fn() }));
jest.mock('pages/room/ui/background/background', () => ({ Background: () => null }));
jest.mock('./chat_box/chat_box', () => ({ ChatBox: () => null }));
jest.mock('./game_settings/game_settings', () => ({ GameSettings: jest.fn(() => null) }));
jest.mock('./header_bar/header_bar', () => ({ HeaderBar: () => null }));
jest.mock('./seats/seats', () => ({ Seats: jest.fn(() => null) }));
jest.mock('./messages', () => ({
  createTranslationMessages: () => ({
    systemNotification: () => 'system',
    roomHostChanged: () => 'host changed',
    playerLeft: () => 'left',
    playerEnter: () => 'entered',
  }),
}));

type Handler = (event: any) => void;

class MockSocket {
  readonly handlers = new Map<string, Set<Handler>>();
  readonly operations: string[] = [];
  on = jest.fn((event: string, handler: Handler) => {
    const handlers = this.handlers.get(event) || new Set<Handler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    return this;
  });
  off = jest.fn((event: string, handler: Handler) => {
    this.operations.push('off');
    this.handlers.get(event)?.delete(handler);
    return this;
  });
  emit = jest.fn((event: string, _content: unknown) => {
    this.operations.push(`emit:${event}`);
    return this;
  });
  disconnect = jest.fn(() => this.operations.push('disconnect'));

  receive(event: WaitingRoomEvent, content: unknown) {
    for (const handler of Array.from(this.handlers.get(event) || [])) {
      handler(content);
    }
  }

  asSocket() {
    return this as unknown as SocketIOClient.Socket;
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function processorFixture() {
  const socket = new MockSocket();
  const avatar = { getRandomAvatarIndex: jest.fn(() => 3) };
  const electron = { setData: jest.fn() };
  const presenter = new WaitingRoomPresenter();
  const store = presenter.createStore('self');
  const rejected = jest.fn();
  const join = jest.fn();
  const processor = new WaitingRoomProcessor(
    socket.asSocket(),
    avatar as unknown as RoomAvatarService,
    {} as React.ComponentProps<typeof WaitingRoom>['translator'],
    electron as unknown as React.ComponentProps<typeof WaitingRoom>['electronLoader'],
    presenter,
    store,
    'tester',
    rejected,
    join,
  );
  return { processor, socket, avatar, electron, presenter, store, rejected, join };
}

const roomInfo = {
  roomName: 'test-room',
  hostPlayerId: 'self',
  coreVersion: 'test-version',
} as TemporaryRoomCreationInfo;

function selfEntry(hostPlayerId: string, snapshotHostPlayerId = hostPlayerId) {
  return {
    playerInfo: { playerId: 'self', playerName: 'tester', avatarId: 3, seatId: 0 },
    otherPlayersInfo: [{ playerId: 'old-host', playerName: 'old host', avatarId: 1, seatId: 1 }],
    disableSeats: [],
    hostPlayerId,
    roomInfo: { ...roomInfo, hostPlayerId: snapshotHostPlayerId },
  };
}

describe('WaitingRoomProcessor host synchronization', () => {
  test('self-entry reports the actual host without mutating an older room snapshot', () => {
    const { processor, socket, presenter, store } = processorFixture();
    const entered = jest.fn();
    processor.on(WaitingRoomEvent.PlayerEnter, entered);
    presenter.initSeatsInfo(store);
    processor.initWaitingRoomConnectionListeners();
    const event = selfEntry('new-host', 'old-host');
    socket.receive(WaitingRoomEvent.PlayerEnter, event);
    expect(entered).toHaveBeenCalledWith({ roomInfo: { ...event.roomInfo, hostPlayerId: 'new-host' } });
    expect(event.roomInfo.hostPlayerId).toBe('old-host');
    processor.dispose();
  });

  test('forwards host departure and manual transfer, but ignores them after disposal', () => {
    const { processor, socket, presenter, store } = processorFixture();
    const hostChanged = jest.fn();
    processor.on('hostChange', hostChanged);
    presenter.initSeatsInfo(store);
    processor.initWaitingRoomConnectionListeners();
    socket.receive(WaitingRoomEvent.PlayerEnter, selfEntry('old-host'));
    const departure = { leftPlayerId: 'old-host', newHostPlayerId: 'self' };
    const transfer = { newHostPlayerId: 'new-host' };
    socket.receive(WaitingRoomEvent.PlayerLeave, departure);
    expect(store.seats.find(seat => seat.seatId === 1)).toEqual({ seatDisabled: false, seatId: 1 });
    socket.receive(WaitingRoomEvent.ChangeHost, transfer);
    expect(hostChanged.mock.calls).toEqual([[{ newHostPlayerId: 'self' }], [transfer]]);
    const captured = socket.on.mock.calls.filter(([event]) =>
      [WaitingRoomEvent.PlayerLeave, WaitingRoomEvent.ChangeHost].includes(event as WaitingRoomEvent),
    );
    processor.dispose();
    for (const [event, handler] of captured) {
      handler(event === WaitingRoomEvent.PlayerLeave ? departure : transfer);
    }
    expect(hostChanged).toHaveBeenCalledTimes(2);
  });
});

describe('WaitingRoomProcessor and WaitingRoomSender disposal', () => {
  test('disposal before initialization is terminal and harmless', () => {
    const { processor, socket } = processorFixture();
    processor.dispose();
    processor.dispose();
    processor.initWaitingRoomConnectionListeners();
    expect(socket.on).not.toHaveBeenCalled();
    expect(socket.off).not.toHaveBeenCalled();
  });

  test('initializes once, removes only owned listeners, and never reactivates after disposal', () => {
    const { processor, socket, store, electron, rejected, join } = processorFixture();
    const foreign = jest.fn();
    const entered = jest.fn();
    const hostChanged = jest.fn();
    socket.on(WaitingRoomEvent.PlayerChatMessage, foreign);
    processor.on(WaitingRoomEvent.PlayerEnter, entered);
    processor.on('hostChange', hostChanged);
    processor.initWaitingRoomConnectionListeners();
    processor.initWaitingRoomConnectionListeners();
    expect(socket.on).toHaveBeenCalledTimes(activeWaitingRoomListeningEvents.length + 1);

    socket.receive(WaitingRoomEvent.PlayerChatMessage, { from: 'other', messageContent: 'hello', timestamp: 1 });
    expect(store.chatMessages).toHaveLength(1);
    const captured = socket.on.mock.calls.slice(1);
    processor.dispose();
    processor.dispose();
    processor.initWaitingRoomConnectionListeners();
    processor.on('hostChange', jest.fn());
    expect(socket.off).toHaveBeenCalledTimes(activeWaitingRoomListeningEvents.length);
    for (const [event, handler] of captured) {
      expect(socket.off).toHaveBeenCalledWith(event, handler);
      // Socket emitters can already have copied the handler before it was removed.
      handler({});
    }
    processor.saveSettingsLocally();
    socket.receive(WaitingRoomEvent.PlayerChatMessage, { from: 'other', messageContent: 'late', timestamp: 2 });
    expect(socket.handlers.get(WaitingRoomEvent.PlayerChatMessage)).toEqual(new Set([foreign]));
    expect(foreign).toHaveBeenCalledTimes(2);
    expect(store.chatMessages).toHaveLength(1);
    expect(electron.setData).not.toHaveBeenCalled();
    expect(entered).not.toHaveBeenCalled();
    expect(hostChanged).not.toHaveBeenCalled();
    expect(rejected).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  test('does not enter a room when avatar generation completes after disposal', async () => {
    const { processor, socket, avatar, electron } = processorFixture();
    const pending = deferred<number>();
    avatar.getRandomAvatarIndex.mockReturnValue(pending.promise as unknown as number);
    processor.initWaitingRoomConnectionListeners();
    socket.receive(WaitingRoomEvent.RoomCreated, { roomInfo });
    expect(avatar.getRandomAvatarIndex).toHaveBeenCalledTimes(1);
    expect(electron.setData).toHaveBeenCalled();
    processor.dispose();
    electron.setData.mockClear();
    pending.resolve(7);
    await pending.promise;
    expect(socket.emit).not.toHaveBeenCalled();
    expect(electron.setData).not.toHaveBeenCalled();
  });

  test('keeps active avatar completion and navigation working before disposal', async () => {
    const { processor, socket, join, rejected } = processorFixture();
    processor.initWaitingRoomConnectionListeners();
    socket.receive(WaitingRoomEvent.RoomCreated, { roomInfo });
    await Promise.resolve();
    expect(socket.emit).toHaveBeenCalledWith(
      WaitingRoomEvent.PlayerEnter,
      expect.objectContaining({ isHost: true, playerInfo: { playerId: 'self', avatarId: 3, playerName: 'tester' } }),
    );
    socket.receive(WaitingRoomEvent.GameStart, { roomId: 'game', roomInfo: {} });
    expect(join).toHaveBeenCalledWith('game', {});
    socket.receive(WaitingRoomEvent.PlayerLeave, { leftPlayerId: 'self' });
    expect(rejected).toHaveBeenCalledTimes(1);
    processor.dispose();
  });

  test('sender deduplicates chat receivers and detaches only its handlers', () => {
    const socket = new MockSocket();
    const sender = new WaitingRoomSender(socket.asSocket());
    const foreign = jest.fn();
    const receiver = jest.fn();
    const otherReceiver = jest.fn();
    socket.on(WaitingRoomEvent.PlayerChatMessage, foreign);
    sender.onReceivingChatMessage(receiver);
    sender.onReceivingChatMessage(receiver);
    sender.onReceivingChatMessage(otherReceiver);
    const owned = socket.on.mock.calls.slice(1).map(([, handler]) => handler);
    const message = { from: 'self', messageContent: 'hello', timestamp: 1 };
    socket.receive(WaitingRoomEvent.PlayerChatMessage, message);
    expect(receiver).toHaveBeenCalledWith({ from: 'self', message: 'hello', timestamp: 1 });
    expect(receiver).toHaveBeenCalledTimes(1);
    expect(otherReceiver).toHaveBeenCalledTimes(1);
    sender.dispose();
    sender.dispose();
    sender.onReceivingChatMessage(jest.fn());
    for (const handler of owned) {
      handler(message);
    }
    socket.receive(WaitingRoomEvent.PlayerChatMessage, message);
    sender.sendChat('self', 'late');
    sender.leaveRoom('self');
    expect(socket.off).toHaveBeenCalledTimes(2);
    expect(socket.handlers.get(WaitingRoomEvent.PlayerChatMessage)).toEqual(new Set([foreign]));
    expect(foreign).toHaveBeenCalledTimes(2);
    expect(receiver).toHaveBeenCalledTimes(1);
    expect(otherReceiver).toHaveBeenCalledTimes(1);
    expect(socket.emit).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});

type WaitingRoomProps = React.ComponentProps<typeof WaitingRoom>;
type PageFixture = {
  readonly hostPlayerId: string;
  readonly isHost: boolean;
  services: {
    roomProcessorService: WaitingRoomProcessor;
    eventSenderService: WaitingRoomSender;
  };
  backwardsToLoddy(): void;
  joinIntoTheGame(ping: number): (roomId: RoomId, info: GameInfo) => void;
  componentWillUnmount(): void;
};

describe('WaitingRoom page cleanup', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let page: PageFixture;
  let socket: MockSocket;
  let props: WaitingRoomProps;
  let audio: { stop: jest.Mock };
  let sharedConnection: { close: jest.Mock };

  beforeEach(() => {
    socket = new MockSocket();
    (IOSocketClient as unknown as jest.Mock).mockReturnValue(socket);
    audio = { stop: jest.fn(() => socket.operations.push('stop')) };
    (installAudioPlayerService as jest.Mock).mockReturnValue(audio);
    sharedConnection = { close: jest.fn() };
    props = {
      config: {
        host: [{ hostTag: ServerHostTag.Localhost, protocol: 'http', host: 'localhost', port: 3000 }],
        ui: { language: Languages.ZH_CN },
        flavor: ClientFlavor.Web,
      },
      logger: new (class extends Logger {
        info = jest.fn();
        error = jest.fn();
        debug = jest.fn();
        dump = jest.fn(() => Promise.resolve());
      })(),
      translator: { tr: (text: string) => text } as WaitingRoomProps['translator'],
      imageLoader: { getWaitingRoomBackgroundImage: jest.fn() } as unknown as WaitingRoomProps['imageLoader'],
      audioLoader: {} as WaitingRoomProps['audioLoader'],
      electronLoader: {
        getTemporaryData: () => 'self',
        getData: (key: ElectronData) => (key === ElectronData.PlayerName ? 'tester' : undefined),
        setData: jest.fn(),
      } as unknown as WaitingRoomProps['electronLoader'],
      getConnectionService: jest.fn(() => sharedConnection) as unknown as WaitingRoomProps['getConnectionService'],
      navigate: jest.fn(),
      getCurrentLocation: () => props.location,
      params: { slug: 'waiting' },
      location: {
        pathname: '/waiting-room/waiting',
        search: '',
        hash: '',
        key: 'waiting',
        state: {
          ping: 12,
          hostConfig: { hostTag: ServerHostTag.Localhost, protocol: 'http', host: 'localhost', port: 3000 },
        },
      },
    };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  function mount() {
    act(() => {
      root!.render(
        <WaitingRoom
          {...props}
          ref={instance => {
            if (instance) {
              page = instance as unknown as PageFixture;
            }
          }}
        />,
      );
    });
  }

  function unmount() {
    act(() => root?.unmount());
    root = undefined;
  }

  afterEach(() => {
    unmount();
    container.remove();
    jest.restoreAllMocks();
  });

  test('keeps host identity, seat flags and settings controls synchronized through transfers and entry', () => {
    mount();
    const expectHost = (hostPlayerId: string, isHost: boolean) => {
      expect(page.hostPlayerId).toBe(hostPlayerId);
      expect(page.isHost).toBe(isHost);
      expect((Seats as jest.Mock).mock.calls.slice(-1)[0][0]).toEqual(
        expect.objectContaining({ hostPlayerId, isHost }),
      );
      expect((GameSettings as jest.Mock).mock.calls.slice(-1)[0][0]).toEqual(
        expect.objectContaining({ controlable: isHost }),
      );
    };
    // A later entrant must not inherit the original host from a stale room snapshot.
    act(() => socket.receive(WaitingRoomEvent.PlayerEnter, selfEntry('old-host', 'self')));
    expectHost('old-host', false);
    const departure = { leftPlayerId: 'old-host', newHostPlayerId: 'self' };
    act(() => socket.receive(WaitingRoomEvent.PlayerLeave, departure));
    expectHost('self', true);
    act(() => socket.receive(WaitingRoomEvent.ChangeHost, { newHostPlayerId: 'new-host' }));
    expectHost('new-host', false);
    act(() => socket.receive(WaitingRoomEvent.ChangeHost, { newHostPlayerId: 'self' }));
    expectHost('self', true);
    // Another player's entry must not reset the current host using its room snapshot.
    act(() =>
      socket.receive(WaitingRoomEvent.PlayerEnter, {
        ...selfEntry('self', 'old-host'),
        playerInfo: { playerId: 'newcomer', playerName: 'newcomer', avatarId: 2, seatId: 2 },
      }),
    );
    expectHost('self', true);

    const lateEvents = new Map<WaitingRoomEvent, unknown>([
      [WaitingRoomEvent.PlayerEnter, selfEntry('late-host')],
      [WaitingRoomEvent.PlayerLeave, { leftPlayerId: 'newcomer', newHostPlayerId: 'late-host' }],
      [WaitingRoomEvent.ChangeHost, { newHostPlayerId: 'late-host' }],
    ]);
    const captured = socket.on.mock.calls.filter(([event]) => lateEvents.has(event as WaitingRoomEvent));
    unmount();
    const seatRenders = (Seats as jest.Mock).mock.calls.length;
    const settingsRenders = (GameSettings as jest.Mock).mock.calls.length;
    act(() => {
      for (const [event, handler] of captured) {
        const content = lateEvents.get(event as WaitingRoomEvent);
        handler(content);
        socket.receive(event as WaitingRoomEvent, content);
      }
    });
    expectHost('self', true);
    expect(Seats).toHaveBeenCalledTimes(seatRenders);
    expect(GameSettings).toHaveBeenCalledTimes(settingsRenders);
    expect(props.navigate).not.toHaveBeenCalled();
  });

  test('leaves first, disposes listeners before disconnect, stops audio once and preserves shared services', () => {
    mount();
    const foreign = jest.fn();
    const receiver = jest.fn();
    socket.on(WaitingRoomEvent.PlayerChatMessage, foreign);
    page.services.eventSenderService.onReceivingChatMessage(receiver);
    const processorDispose = jest.spyOn(page.services.roomProcessorService, 'dispose');
    const senderDispose = jest.spyOn(page.services.eventSenderService, 'dispose');
    const lateHandlers = socket.on.mock.calls.filter(([, handler]) => handler !== foreign);
    const back = page.backwardsToLoddy;
    const join = page.joinIntoTheGame(12);
    socket.operations.length = 0;
    socket.emit.mockClear();

    unmount();
    page.componentWillUnmount();
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith(WaitingRoomEvent.PlayerLeave, { leftPlayerId: 'self' });
    expect(socket.operations).toEqual([
      `emit:${WaitingRoomEvent.PlayerLeave}`,
      ...Array(activeWaitingRoomListeningEvents.length + 1).fill('off'),
      'disconnect',
      'stop',
    ]);
    expect(processorDispose).toHaveBeenCalledTimes(1);
    expect(senderDispose).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(audio.stop).toHaveBeenCalledTimes(1);
    for (const [, handler] of lateHandlers) {
      handler({});
    }
    back();
    join(999, {} as GameInfo);
    socket.receive(WaitingRoomEvent.PlayerChatMessage, {});
    expect(props.navigate).not.toHaveBeenCalled();
    expect(receiver).not.toHaveBeenCalled();
    expect(foreign).toHaveBeenCalledTimes(1);
    expect(sharedConnection.close).not.toHaveBeenCalled();
    expect(props.getConnectionService).not.toHaveBeenCalled();
  });

  test('fresh mounts release independent sockets and leave no owned listeners behind', () => {
    const sockets: MockSocket[] = [];
    const stops: jest.Mock[] = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      if (cycle > 0) {
        root = createRoot(container);
      }
      socket = new MockSocket();
      (IOSocketClient as unknown as jest.Mock).mockReturnValue(socket);
      audio = { stop: jest.fn() };
      (installAudioPlayerService as jest.Mock).mockReturnValue(audio);
      sockets.push(socket);
      stops.push(audio.stop);
      mount();
      unmount();
      page.componentWillUnmount();
    }
    expect(IOSocketClient).toHaveBeenCalledTimes(3);
    for (const instance of sockets) {
      expect(instance.disconnect).toHaveBeenCalledTimes(1);
      expect(instance.off).toHaveBeenCalledTimes(activeWaitingRoomListeningEvents.length);
      expect(Array.from(instance.handlers.values()).every(handlers => handlers.size === 0)).toBe(true);
      expect(instance.emit.mock.calls.filter(([event]) => event === WaitingRoomEvent.PlayerLeave)).toHaveLength(1);
    }
    for (const stop of stops) {
      expect(stop).toHaveBeenCalledTimes(1);
    }
    expect(sharedConnection.close).not.toHaveBeenCalled();
  });

  test('unmount cancels the real processor avatar continuation without a late enter or navigation', async () => {
    const pending = deferred<number>();
    jest
      .spyOn(RoomAvatarService.prototype, 'getRandomAvatarIndex')
      .mockReturnValue(pending.promise as unknown as number);
    props.location.state = { ...(props.location.state as object), roomInfo };
    mount();
    act(() => socket.receive(WaitingRoomEvent.RoomCreated, { roomInfo }));
    unmount();
    socket.emit.mockClear();
    await act(async () => {
      pending.resolve(4);
      await pending.promise;
    });
    page.componentWillUnmount();
    expect(socket.emit).not.toHaveBeenCalled();
    expect(props.navigate).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(audio.stop).toHaveBeenCalledTimes(1);
  });
});
