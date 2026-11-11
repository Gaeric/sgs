import { TemporaryRoomCreationInfo } from 'core/game/game_props';
import { GameMode, RoomMode } from 'core/shares/types/room_props';
import { RoomInfo } from 'core/shares/types/server_types';
import { runInAction } from 'mobx';
import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { installAudioPlayerService } from 'ui/audio/install';
import { Lobby } from './lobby';

// Mount the real page with real MobX observables/lifecycle, isolating services
// and child views so these tests only exercise resources owned by the lobby.
jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'test-version' } }));
jest.mock('ui/audio/install', () => ({ installAudioPlayerService: jest.fn() }));
jest.mock('pages/room/ui/background/background', () => ({ Background: () => null }));
jest.mock('pages/ui/settings/settings', () => ({ SettingsDialog: () => null }));
jest.mock('ui/button/button', () => ({ Button: () => null }));
jest.mock('ui/button/link_button', () => ({ LinkButton: () => null }));
jest.mock('ui/picture/picture', () => ({ Picture: () => null }));
jest.mock('ui/signal_bar/signal_bar', () => ({ SignalBar: () => null }));
jest.mock('ui/tooltip/tooltip', () => ({ Tooltip: () => null }));
jest.mock('./ui/acknowledge_dialog/acknowledge_dialog', () => ({ AcknowledgeDialog: () => null }));
jest.mock('./ui/chat/chat', () => ({ Chat: () => null }));
jest.mock('./ui/create_room_button/create_room_button', () => ({ CreateRoomButton: () => null }));
jest.mock('./ui/create_room_dialog/create_room_dialog', () => ({ CreateRoomDialog: () => null }));
jest.mock('./ui/enter_passcode_dialog/enter_passcode_dialog', () => ({ EnterPasscodeDialog: () => null }));
jest.mock('./ui/feedback_dialog/feedback_dialog', () => ({ FeedbackDialog: () => null }));

type LobbyProps = React.ComponentProps<typeof Lobby>;
type HostRoom = { info: RoomInfo; host: string; ping: number };
// Explicit test-only access to callbacks normally passed to child views.
type LobbyFixture = {
  roomList: HostRoom[];
  gameLog: string;
  updateTo: string;
  updateProgress: number;
  updateComplete: boolean;
  updateDownloadingFile: number;
  updateDownloadTotalFile: number;
  onClickRefresh(): void;
  onOpenReplay(): void;
  onRoomCreated(info: TemporaryRoomCreationInfo, name: string): void;
  enterRoom(info: HostRoom): () => void;
  enterRoomAsObserver(info: HostRoom): () => void;
  onPasscodeSubmit(passcode: string): void;
};

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void; reject(error: Error): void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function room(id: number, passcode?: string): HostRoom {
  return {
    info: {
      id,
      name: `room-${id}`,
      packages: [],
      status: 'waiting',
      gameMode: GameMode.Standard,
      allowObserver: true,
      activePlayers: 1,
      totalPlayers: 8,
      passcode,
    },
    host: 'test-host',
    ping: 12,
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('Lobby async cleanup', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let page: LobbyFixture;
  let props: LobbyProps;
  let gameLog: Deferred<string>;
  let replay: Deferred<unknown>;
  let electron: {
    getData: jest.Mock;
    saveTemporaryData: jest.Mock;
    refreshReplayDataFlow: jest.Mock;
    whenUpdate: jest.Mock;
    getGameLog: jest.Mock;
    readReplay: jest.Mock;
  };
  let lobby: { getRoomList: jest.Mock; createWaitingRoom: jest.Mock; checkRoomExist: jest.Mock; close: jest.Mock };
  let campaign: { createRoom: jest.Mock };
  let audio: { playLobbyBGM: jest.Mock; stop: jest.Mock };
  let closeConnection: jest.Mock;

  beforeEach(() => {
    gameLog = deferred<string>();
    replay = deferred<unknown>();
    electron = {
      getData: jest.fn(() => 'tester'),
      saveTemporaryData: jest.fn(),
      refreshReplayDataFlow: jest.fn(),
      whenUpdate: jest.fn(),
      getGameLog: jest.fn(() => gameLog.promise),
      readReplay: jest.fn(() => replay.promise),
    };
    lobby = { getRoomList: jest.fn(), createWaitingRoom: jest.fn(), checkRoomExist: jest.fn(), close: jest.fn() };
    campaign = { createRoom: jest.fn() };
    audio = { playLobbyBGM: jest.fn(), stop: jest.fn() };
    closeConnection = jest.fn();
    (installAudioPlayerService as jest.Mock).mockReturnValue(audio);
    props = {
      config: { host: [{ hostTag: 'test-host' }] } as LobbyProps['config'],
      logger: { error: jest.fn() } as unknown as LobbyProps['logger'],
      translator: { tr: (text: string) => text, trx: (text: string) => text } as LobbyProps['translator'],
      imageLoader: {
        getLobbyBackgroundImage: jest.fn(),
        getRandomLobbyIllustration: jest.fn(),
        getGameLogBoradImage: jest.fn(),
        getRoomListBackgroundImage: jest.fn(),
        getLobbyButtonImage: jest.fn(),
        getGameModeIcon: jest.fn(),
      } as unknown as LobbyProps['imageLoader'],
      audioLoader: {} as LobbyProps['audioLoader'],
      electronLoader: electron as unknown as LobbyProps['electronLoader'],
      connectionService: { Lobby: lobby, close: closeConnection } as unknown as LobbyProps['connectionService'],
      campaignService: campaign as unknown as LobbyProps['campaignService'],
      navigate: jest.fn(),
      params: {},
      location: { pathname: '/lobby', search: '', hash: '', key: 'lobby', state: null },
      getCurrentLocation: jest.fn(() => ({ pathname: '/waiting-room/1' })) as LobbyProps['getCurrentLocation'],
    };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <Lobby
          {...props}
          ref={instance => {
            if (instance) {
              page = instance as unknown as LobbyFixture;
            }
          }}
        />,
      );
    });
  });

  function unmount() {
    act(() => root?.unmount());
    root = undefined;
  }

  afterEach(async () => {
    unmount();
    await flush();
    container.remove();
    jest.restoreAllMocks();
  });

  function receiveRooms(query: number, ...rooms: HostRoom[]) {
    act(() => {
      lobby.getRoomList.mock.calls[query][0]({ packet: rooms.map(item => item.info), hostTag: 'test-host', ping: 12 });
    });
  }

  test('late updater, room list, game log and replay completions cannot mutate or navigate after unmount', async () => {
    act(() => page.onOpenReplay());
    const before = {
      log: page.gameLog,
      version: page.updateTo,
      progress: page.updateProgress,
      complete: page.updateComplete,
      file: page.updateDownloadingFile,
      total: page.updateDownloadTotalFile,
    };
    unmount();
    act(() => electron.whenUpdate.mock.calls[0][0]('next-version', 0.75, 10, true, 7));
    receiveRooms(0, room(1));
    gameLog.resolve('<p>late log</p>');
    replay.resolve({ events: [] });
    await flush();
    expect(page.roomList).toEqual([]);
    expect({
      log: page.gameLog,
      version: page.updateTo,
      progress: page.updateProgress,
      complete: page.updateComplete,
      file: page.updateDownloadingFile,
      total: page.updateDownloadTotalFile,
    }).toEqual(before);
    expect(props.navigate).not.toHaveBeenCalled();
    expect(electron.whenUpdate).toHaveBeenCalledTimes(1);
    expect(electron.whenUpdate.mock.calls[0][0]).toEqual(expect.any(Function));
    expect(lobby.close).not.toHaveBeenCalled();
    expect(closeConnection).not.toHaveBeenCalled();
  });

  test('repeated refresh ignores older generations while accepting every host response from the current query', () => {
    receiveRooms(0, room(1));
    act(() => page.onClickRefresh());
    act(() => page.onClickRefresh());
    expect(page.roomList).toEqual([]);
    receiveRooms(2, room(3));
    receiveRooms(0, room(4));
    receiveRooms(1, room(5));
    receiveRooms(2, room(6));
    expect(page.roomList.map(item => item.info.id)).toEqual([3, 6]);
    unmount();
    receiveRooms(2, room(7));
    page.onClickRefresh();
    expect(lobby.getRoomList).toHaveBeenCalledTimes(3);
    expect(page.roomList.map(item => item.info.id)).toEqual([3, 6]);
  });

  test.each([false, true])(
    'create callbacks preserve live navigation but ignore late success/error (campaign: %s)',
    campaignMode => {
      const info = { campaignMode, hostPlayerId: 'host' } as TemporaryRoomCreationInfo;
      act(() => page.onRoomCreated(info, 'test room'));
      const callback = campaignMode ? campaign.createRoom.mock.calls[0][2] : lobby.createWaitingRoom.mock.calls[0][1];
      const event = { packet: { roomId: 42, roomInfo: { gameMode: 'test-mode' } }, hostTag: 'test-host', ping: 12 };
      act(() => callback(event));
      expect(props.navigate).toHaveBeenCalledWith(campaignMode ? '/room/42' : '/waiting-room/42', expect.any(Object));
      (props.navigate as jest.Mock).mockClear();
      unmount();
      callback(event);
      callback({ error: new Error('stale creation') });
      expect(props.navigate).not.toHaveBeenCalled();
      expect(props.logger.error).not.toHaveBeenCalled();
    },
  );

  test.each(['join', 'observe', 'passcode'])(
    'ignores late successful and failed %s checks without removing rooms',
    kind => {
      const target = room(1, kind === 'passcode' ? 'secret' : undefined);
      receiveRooms(0, target);
      act(() => {
        runInAction(() => {
          if (kind === 'observe') {
            page.enterRoomAsObserver(target)();
          } else {
            page.enterRoom(target)();
            if (kind === 'passcode') {
              page.onPasscodeSubmit('secret');
            }
          }
        });
      });
      const callback = lobby.checkRoomExist.mock.calls[0][2];
      unmount();
      callback(true, 12);
      callback(false, 12);
      expect(props.navigate).not.toHaveBeenCalled();
      expect(page.roomList.map(item => item.info.id)).toEqual([1]);
    },
  );

  test('retained child callbacks cannot start another request after unmount', () => {
    const join = page.enterRoom(room(1));
    const observe = page.enterRoomAsObserver(room(2));
    unmount();
    join();
    observe();
    page.onRoomCreated({} as TemporaryRoomCreationInfo, 'late room');
    page.onPasscodeSubmit('late passcode');
    page.onOpenReplay();
    expect(lobby.checkRoomExist).not.toHaveBeenCalled();
    expect(lobby.createWaitingRoom).not.toHaveBeenCalled();
    expect(campaign.createRoom).not.toHaveBeenCalled();
    expect(electron.readReplay).not.toHaveBeenCalled();
    expect(props.navigate).not.toHaveBeenCalled();
  });

  test('live completions still populate data, updater state, observer navigation and replay navigation', async () => {
    act(() => electron.whenUpdate.mock.calls[0][0]('next-version', 0.25, 8, false, 2));
    gameLog.resolve('<p>current log</p>');
    act(() => page.onOpenReplay());
    replay.resolve({ events: [] });
    await flush();
    expect(page.gameLog).toBe('<p>current log</p>');
    expect(page.updateProgress).toBe(0.25);
    expect(page.updateDownloadingFile).toBe(2);
    expect(props.navigate).toHaveBeenCalledWith('/replay', { state: { replayData: { events: [] } } });
    act(() => page.enterRoomAsObserver(room(1))());
    act(() => lobby.checkRoomExist.mock.calls[0][2](true, 12));
    expect(props.navigate).toHaveBeenCalledWith('/room/1', {
      state: { ping: 12, hostConfig: props.config.host[0], roomMode: RoomMode.Observer },
    });
  });

  test.each([false, true])(
    'logs real game log/replay rejections without unhandled promises (unmounted: %s)',
    async leave => {
      act(() => page.onOpenReplay());
      if (leave) {
        unmount();
      }
      const logError = new Error('game log failed');
      const replayError = new Error('read replay failed');
      gameLog.reject(logError);
      replay.reject(replayError);
      await flush();
      expect(props.logger.error).toHaveBeenCalledTimes(2);
      expect(props.logger.error).toHaveBeenCalledWith(logError);
      expect(props.logger.error).toHaveBeenCalledWith(replayError);
      expect(props.navigate).not.toHaveBeenCalled();
    },
  );

  test.each(['/characters', '/waiting-room/1', '/room/1', '/replay', '/lobby'])(
    'preserves BGM destination behavior for %s',
    pathname => {
      (props.getCurrentLocation as jest.Mock).mockReturnValue({ pathname });
      expect(audio.playLobbyBGM).toHaveBeenCalledTimes(1);
      unmount();
      expect(audio.stop).toHaveBeenCalledTimes(pathname === '/characters' ? 0 : 1);
    },
  );
});
