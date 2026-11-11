import { GameEventIdentifiers, ServerEventFinder } from 'core/event/event';
import { EventPacker } from 'core/event/event_packer';
import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ReplayDataType } from 'types/replay_props';
import { installAudioPlayerService } from 'ui/audio/install';
import { ReplayClientProcessor } from './game_processor.replay';
import { installService } from './install_service';
import { ReplayRoomPage } from './replay_room';
import { RoomPresenter } from './room.presenter';

// Exercise the real page constructor, render, and lifecycle; isolate the engine,
// processor, services and child views just as room.routing.test.tsx does.
jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'test-version' } }));
jest.mock('core/network/socket.offline', () => ({ ClientOfflineSocket: jest.fn() }));
jest.mock('ui/audio/install', () => ({ installAudioPlayerService: jest.fn() }));
jest.mock('./game_processor.replay', () => ({ ReplayClientProcessor: jest.fn() }));
jest.mock('./install_service', () => ({ installService: jest.fn() }));
jest.mock('./room.presenter', () => ({ RoomPresenter: jest.fn() }));
jest.mock('pages/ui/settings/settings', () => ({ SettingsDialog: () => null }));
jest.mock('./ui/background/background', () => ({ Background: () => null }));
jest.mock('./ui/banner/banner', () => ({ Banner: () => null }));
jest.mock('./ui/dashboard/dashboard', () => ({ Dashboard: () => null }));
jest.mock('./ui/game_dialog/game_dialog', () => ({ GameDialog: () => null }));
jest.mock('./ui/gameboard/gameboard', () => ({ GameBoard: () => null }));
jest.mock('./ui/seats_layout/seats_layout', () => ({ SeatsLayout: () => null }));

type ReplayProps = React.ComponentProps<typeof ReplayRoomPage>;
type ReplayEvent = ServerEventFinder<GameEventIdentifiers>;
type ReplayLoop = { loadSteps(events: ReplayEvent[]): Promise<void> };

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function event(identifier = GameEventIdentifiers.CardUseEvent, message = 'event'): ReplayEvent {
  return EventPacker.createIdentifierEvent(identifier, {
    messages: [message],
    numberOfDrawStack: 30,
    circle: 2,
  } as ReplayEvent);
}

function bulk(events: ReplayEvent[]): ReplayEvent {
  return EventPacker.createIdentifierEvent(GameEventIdentifiers.PlayerBulkPacketEvent, {
    stackedLostMessages: events,
  } as ServerEventFinder<GameEventIdentifiers.PlayerBulkPacketEvent>);
}

async function flushReplay() {
  await act(async () => {
    // Nested bulk awaits must also have an opportunity to unwind.
    for (let index = 0; index < 10; index++) {
      await Promise.resolve();
    }
  });
}

describe('ReplayRoomPage replay cleanup', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let props: ReplayProps;
  let processor: { onHandleIncomingEvent: jest.Mock; dispose: jest.Mock };
  let animations: {
    GuideLineAnimation: { animate: jest.Mock; dispose: jest.Mock };
    MoveInstantCardAnimation: { dispose: jest.Mock };
  };
  let audio: { playRoomBGM: jest.Mock; stop: jest.Mock };
  let presenter: {
    createStore: jest.Mock;
    setupClientPlayerId: jest.Mock;
    createClientRoom: jest.Mock;
    addGameLog: jest.Mock;
    updateNumberOfDrawStack: jest.Mock;
    updateGameCircle: jest.Mock;
  };
  let loadSteps: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    processor = { onHandleIncomingEvent: jest.fn().mockResolvedValue(undefined), dispose: jest.fn() };
    (ReplayClientProcessor as jest.Mock).mockImplementation(() => processor);
    animations = {
      GuideLineAnimation: { animate: jest.fn(), dispose: jest.fn() },
      MoveInstantCardAnimation: { dispose: jest.fn() },
    };
    (installService as jest.Mock).mockReturnValue({ Animation: animations });
    audio = { playRoomBGM: jest.fn(), stop: jest.fn() };
    (installAudioPlayerService as jest.Mock).mockReturnValue(audio);
    presenter = {
      createStore: jest.fn(() => ({
        clientPlayerId: 'viewer',
        animationPosition: { insertPlayer: jest.fn() },
      })),
      setupClientPlayerId: jest.fn(),
      createClientRoom: jest.fn(),
      addGameLog: jest.fn(),
      updateNumberOfDrawStack: jest.fn(),
      updateGameCircle: jest.fn(),
    };
    (RoomPresenter as jest.Mock).mockImplementation(() => presenter);
    props = {
      config: {} as ReplayProps['config'],
      logger: { error: jest.fn() } as unknown as ReplayProps['logger'],
      translator: { setupPlayer: jest.fn(), trx: jest.fn(message => message) } as unknown as ReplayProps['translator'],
      audioLoader: {} as ReplayProps['audioLoader'],
      imageLoader: { getBackgroundImage: jest.fn() } as unknown as ReplayProps['imageLoader'],
      electronLoader: { getData: jest.fn() } as unknown as ReplayProps['electronLoader'],
      connectionService: {} as ReplayProps['connectionService'],
      navigate: jest.fn(),
      params: {},
      location: { pathname: '/replay', search: '', hash: '', key: 'replay', state: null },
      getCurrentLocation: jest.fn(),
    };
    loadSteps = jest.spyOn(ReplayRoomPage.prototype as unknown as ReplayLoop, 'loadSteps');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  function unmount() {
    act(() => root?.unmount());
    root = undefined;
  }

  afterEach(async () => {
    unmount();
    await flushReplay();
    container.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function mount(events: ReplayEvent[]) {
    props.location.state = {
      replayData: {
        viewerId: 'viewer',
        roomId: 42,
        gameInfo: {},
        playersInfo: [],
        events,
      } as unknown as ReplayDataType,
    };
    act(() => root!.render(<ReplayRoomPage {...props} />));
    return loadSteps.mock.results[0].value as Promise<void>;
  }

  test('a deferred handler finishing after unmount cannot log, animate, update status or start another event', async () => {
    const handler = deferred();
    processor.onHandleIncomingEvent.mockReturnValueOnce(handler.promise);
    const replay = mount([event(), event()]);
    unmount();
    handler.resolve();
    await act(async () => replay);

    expect(processor.onHandleIncomingEvent).toHaveBeenCalledTimes(1);
    expect(presenter.addGameLog).not.toHaveBeenCalled();
    expect(animations.GuideLineAnimation.animate).not.toHaveBeenCalled();
    expect(presenter.updateNumberOfDrawStack).not.toHaveBeenCalled();
    expect(presenter.updateGameCircle).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    expect(processor.dispose).toHaveBeenCalledTimes(1);
    expect(animations.GuideLineAnimation.dispose).toHaveBeenCalledTimes(1);
    expect(animations.MoveInstantCardAnimation.dispose).toHaveBeenCalledTimes(1);
    expect(audio.stop).toHaveBeenCalledTimes(1);
  });

  test('stops siblings at every nested bulk level after an in-flight handler completes', async () => {
    const handler = deferred();
    processor.onHandleIncomingEvent.mockReturnValueOnce(handler.promise);
    const replay = mount([bulk([bulk([event(), event()]), event()]), event()]);
    expect(loadSteps).toHaveBeenCalledTimes(3);
    unmount();
    handler.resolve();
    await act(async () => replay);
    expect(processor.onHandleIncomingEvent).toHaveBeenCalledTimes(1);
    expect(presenter.addGameLog).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each([GameEventIdentifiers.CardUseEvent, GameEventIdentifiers.NotifyEvent])(
    'cancels its pending step timer and settles the complete nested replay for event %s',
    async identifier => {
      const replay = mount([bulk([bulk([event(identifier), event()]), event()]), event()]);
      await flushReplay();
      expect(jest.getTimerCount()).toBe(1);
      expect(presenter.addGameLog).toHaveBeenCalledTimes(1);
      unmount();
      expect(jest.getTimerCount()).toBe(0);
      // Clearing a timeout without resolving its promise would leave this await hanging.
      await act(async () => replay);
      expect(processor.onHandleIncomingEvent).toHaveBeenCalledTimes(1);
      expect(props.logger.error).not.toHaveBeenCalled();
    },
  );

  test('preserves handler/log/animation/status ordering and the 2000ms and zero-delay boundaries while mounted', async () => {
    const order: string[] = [];
    processor.onHandleIncomingEvent.mockImplementation(async () => {
      order.push('handler');
    });
    presenter.addGameLog.mockImplementation(() => order.push('log'));
    animations.GuideLineAnimation.animate.mockImplementation(() => order.push('animation'));
    presenter.updateNumberOfDrawStack.mockImplementation(() => order.push('draw-stack'));
    presenter.updateGameCircle.mockImplementation(() => order.push('circle'));
    const first = event();
    const second = event(GameEventIdentifiers.NotifyEvent);
    const third = event();
    const replay = mount([first, bulk([second]), third]);
    await flushReplay();
    expect(order).toEqual(['handler', 'log', 'animation', 'draw-stack', 'circle']);
    act(() => jest.advanceTimersByTime(1999));
    await flushReplay();
    expect(processor.onHandleIncomingEvent).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(1));
    await flushReplay();
    expect(processor.onHandleIncomingEvent).toHaveBeenCalledTimes(2);
    act(() => jest.runOnlyPendingTimers());
    await flushReplay();
    expect(processor.onHandleIncomingEvent.mock.calls.map(([, content]) => content)).toEqual([first, second, third]);
    expect(order).toEqual(Array(3).fill(['handler', 'log', 'animation', 'draw-stack', 'circle']).flat());
    act(() => jest.advanceTimersByTime(2000));
    await act(async () => replay);
    expect(jest.getTimerCount()).toBe(0);
    expect(props.logger.error).not.toHaveBeenCalled();
  });

  test.each([false, true])(
    'reports real handler rejections without an unhandled promise (unmounted: %s)',
    async leave => {
      const handler = deferred();
      processor.onHandleIncomingEvent.mockReturnValueOnce(handler.promise);
      mount([bulk([event(), event()]), event()]);
      const unhandled = jest.fn();
      window.addEventListener('unhandledrejection', unhandled);
      try {
        if (leave) {
          unmount();
        }
        const failure = new Error('replay handler failed');
        handler.reject(failure);
        await flushReplay();
        expect(props.logger.error).toHaveBeenCalledTimes(1);
        expect(props.logger.error).toHaveBeenCalledWith(failure);
        expect(processor.onHandleIncomingEvent).toHaveBeenCalledTimes(1);
        expect(presenter.addGameLog).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('unhandledrejection', unhandled);
      }
    },
  );

  test.each([null, {}])('redirects safely when replay state is missing: %s', state => {
    props.location.state = state;
    act(() => root!.render(<ReplayRoomPage {...props} />));
    expect(props.navigate).toHaveBeenCalledWith('/lobby');
    expect(presenter.createClientRoom).not.toHaveBeenCalled();
    expect(processor.onHandleIncomingEvent).not.toHaveBeenCalled();
    expect(audio.playRoomBGM).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });
});
