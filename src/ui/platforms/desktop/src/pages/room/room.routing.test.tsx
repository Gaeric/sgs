import { GameEventIdentifiers } from 'core/event/event';
import type { TemporaryRoomCreationInfo } from 'core/game/game_props';
import { LocalClientEmitter } from 'core/network/local/local_emitter.client';
import { ClientSocket } from 'core/network/socket.client';
import { RoomMode } from 'core/shares/types/room_props';
import { ElectronData } from 'electron_loader/electron_data';
import { ServerHostTag } from 'props/config_props';
import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  Location,
  MemoryRouter,
  NavigateFunction,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { installAudioPlayerService } from 'ui/audio/install';
import { GameClientProcessor } from './game_processor';
import { installService } from './install_service';
import { RoomPage } from './room';
import { RoomPresenter } from './room.presenter';

// Mount the actual page and run its real constructor/render/lifecycle/router calls.
// The engine, transport, services and child views are deliberately outside this test.
jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'test-version' } }));
jest.mock('core/network/local/local_emitter.client', () => ({ LocalClientEmitter: jest.fn() }));
jest.mock('core/network/socket.client', () => ({ ClientSocket: jest.fn() }));
jest.mock('ui/audio/install', () => ({ installAudioPlayerService: jest.fn() }));
jest.mock('./game_processor', () => ({ GameClientProcessor: jest.fn() }));
jest.mock('./install_service', () => ({ installService: jest.fn() }));
jest.mock('./room.presenter', () => ({ RoomPresenter: jest.fn() }));
jest.mock('pages/ui/settings/settings', () => ({ SettingsDialog: () => null }));
jest.mock('./ui/background/background', () => ({ Background: () => null }));
jest.mock('./ui/banner/banner', () => ({ Banner: () => null }));
jest.mock('./ui/dashboard/dashboard', () => ({ Dashboard: () => null }));
jest.mock('./ui/game_dialog/game_dialog', () => ({ GameDialog: () => null }));
jest.mock('./ui/gameboard/gameboard', () => ({ GameBoard: () => null }));
jest.mock('./ui/seats_layout/seats_layout', () => ({ SeatsLayout: () => null }));

type RoomProps = React.ComponentProps<typeof RoomPage>;
type SocketFixture = {
  on: jest.Mock;
  onReconnected: jest.Mock;
  notify: jest.Mock;
  disconnect: jest.Mock;
};
type CreateWaitingRoom = (info: TemporaryRoomCreationInfo, roomId: number) => void;

const remoteHost = { host: 'remote.test', protocol: 'https', port: 8443, hostTag: ServerHostTag.ShangHai };
const localHost = { host: 'localhost', protocol: 'http', port: 8080, hostTag: ServerHostTag.Localhost };

describe('RoomPage routing and beforeunload lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let props: Omit<RoomProps, 'navigate' | 'params' | 'location' | 'getCurrentLocation'>;
  let router: { navigate: NavigateFunction; location: Location };
  let sockets: SocketFixture[];
  let audio: { playRoomBGM: jest.Mock; stop: jest.Mock };
  let presenter: { createStore: jest.Mock; setupRoomStatus: jest.Mock };
  let addListener: jest.SpyInstance;
  let removeListener: jest.SpyInstance;

  function RouterProbe() {
    router = { navigate: useNavigate(), location: useLocation() };
    return null;
  }

  function RoomRoute() {
    const location = useLocation();
    const currentLocation = React.useRef(location);
    currentLocation.current = location;
    return (
      <RoomPage
        {...props}
        params={useParams()}
        navigate={useNavigate()}
        location={location}
        getCurrentLocation={() => currentLocation.current}
      />
    );
  }

  beforeEach(() => {
    sockets = [];
    const createSocket = () => {
      const socket = { on: jest.fn(), onReconnected: jest.fn(), notify: jest.fn(), disconnect: jest.fn() };
      sockets.push(socket);
      return socket;
    };
    (ClientSocket as jest.Mock).mockImplementation(createSocket);
    (LocalClientEmitter as jest.Mock).mockImplementation(createSocket);
    audio = { playRoomBGM: jest.fn(), stop: jest.fn() };
    (installAudioPlayerService as jest.Mock).mockReturnValue(audio);
    (installService as jest.Mock).mockReturnValue({});
    (GameClientProcessor as jest.Mock).mockImplementation(() => ({}));
    presenter = {
      createStore: jest.fn(() => ({ clientPlayerId: 'player-id', clientRoomInfo: { timestamp: 123 } })),
      setupRoomStatus: jest.fn(),
    };
    (RoomPresenter as jest.Mock).mockImplementation(() => presenter);
    props = {
      config: { host: [localHost, remoteHost] } as RoomProps['config'],
      logger: {} as RoomProps['logger'],
      translator: {} as RoomProps['translator'],
      audioLoader: {} as RoomProps['audioLoader'],
      imageLoader: { getBackgroundImage: jest.fn() } as unknown as RoomProps['imageLoader'],
      electronLoader: {
        getData: jest.fn(key => (key === ElectronData.PlayerName ? 'Alice' : undefined)),
        getTemporaryData: jest.fn(() => 'player-id'),
      } as unknown as RoomProps['electronLoader'],
      getConnectionService: jest.fn(() => ({} as ReturnType<RoomProps['getConnectionService']>)),
    };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    addListener = jest.spyOn(window, 'addEventListener');
    removeListener = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    container.remove();
    jest.restoreAllMocks();
  });

  function renderRoom(roomMode = RoomMode.Online, slug = '42') {
    act(() =>
      root!.render(
        <MemoryRouter initialEntries={[{ pathname: `/room/${slug}`, state: { hostConfig: remoteHost, roomMode } }]}>
          <RouterProbe />
          <Routes>
            <Route path="/room/:slug" element={<RoomRoute />} />
            <Route path="*" element={<div data-testid="destination" />} />
          </Routes>
        </MemoryRouter>,
      ),
    );
  }

  function leaveCalls(socket: SocketFixture) {
    return socket.notify.mock.calls.filter(([identifier]) => identifier === GameEventIdentifiers.PlayerLeaveEvent);
  }

  function unloadListeners(spy: jest.SpyInstance) {
    return spy.mock.calls.filter(([event]) => event === 'beforeunload').map(([, listener]) => listener);
  }

  test('removes the exact listener on every route unmount, without stale callbacks on later mounts', () => {
    renderRoom();
    for (let index = 0; index < 3; index++) {
      const socket = sockets[index];
      expect(unloadListeners(addListener)).toHaveLength(index + 1);
      expect(leaveCalls(socket)).toHaveLength(0);

      act(() => router.navigate('/lobby'));
      const registered = unloadListeners(addListener);
      const removed = unloadListeners(removeListener);
      expect(removed).toHaveLength(index + 1);
      expect(removed[index]).toBe(registered[index]);
      expect(leaveCalls(socket)).toHaveLength(1);
      expect(leaveCalls(socket)[0][1]).toEqual(expect.objectContaining({ playerId: 'player-id' }));
      expect(socket.disconnect).not.toHaveBeenCalled();

      // With no room mounted, beforeunload must not reach any previous socket.
      act(() => window.dispatchEvent(new Event('beforeunload')));
      sockets.forEach(previous => expect(leaveCalls(previous)).toHaveLength(1));
      if (index < 2) {
        act(() =>
          router.navigate(`/room/${43 + index}`, { state: { hostConfig: remoteHost, roomMode: RoomMode.Online } }),
        );
      }
    }
    expect(new Set(unloadListeners(addListener)).size).toBe(3);
    expect(audio.playRoomBGM).toHaveBeenCalledTimes(3);
    expect(audio.stop).toHaveBeenCalledTimes(3);
  });

  test.each([RoomMode.Online, RoomMode.Observer, RoomMode.Campaign])(
    'resolves slug, joins and preserves leave versus disconnect behavior for room mode %s',
    roomMode => {
      renderRoom(roomMode, '73');
      const socket = sockets[0];
      expect(props.getConnectionService).toHaveBeenCalledWith(roomMode === RoomMode.Campaign);
      expect(presenter.setupRoomStatus).toHaveBeenCalledWith(
        expect.objectContaining({ roomId: 73, playerName: 'Alice', playerId: 'player-id', socket }),
      );
      if (roomMode === RoomMode.Campaign) {
        expect(LocalClientEmitter).toHaveBeenCalledWith((window as any).eventEmitter, '73');
        expect(ClientSocket).not.toHaveBeenCalled();
      } else {
        expect(ClientSocket).toHaveBeenCalledWith('https://remote.test:8443/room-73', '73');
        expect(LocalClientEmitter).not.toHaveBeenCalled();
      }
      expect(socket.notify).toHaveBeenCalledWith(
        GameEventIdentifiers.PlayerEnterEvent,
        expect.objectContaining({
          playerId: 'player-id',
          coreVersion: 'test-version',
          joinAsObserver: roomMode === RoomMode.Observer,
        }),
      );
      // The active listener still performs the existing unload behavior.
      act(() => window.dispatchEvent(new Event('beforeunload')));
      if (roomMode === RoomMode.Campaign) {
        expect(socket.disconnect).toHaveBeenCalledTimes(1);
        expect(leaveCalls(socket)).toHaveLength(0);
      } else {
        expect(leaveCalls(socket)).toHaveLength(1);
        expect(socket.disconnect).not.toHaveBeenCalled();
      }
      act(() => root!.unmount());
      root = undefined;
      expect(unloadListeners(removeListener)).toEqual(unloadListeners(addListener));
      // Unmount keeps its own disconnect call, even after a beforeunload event.
      const disconnectCount = roomMode === RoomMode.Campaign ? 2 : 0;
      const leaveCount = roomMode === RoomMode.Campaign ? 0 : 2;
      expect(socket.disconnect).toHaveBeenCalledTimes(disconnectCount);
      expect(leaveCalls(socket)).toHaveLength(leaveCount);
      act(() => window.dispatchEvent(new Event('beforeunload')));
      expect(socket.disconnect).toHaveBeenCalledTimes(disconnectCount);
      expect(leaveCalls(socket)).toHaveLength(leaveCount);
      expect(audio.stop).toHaveBeenCalledTimes(1);
    },
  );

  test.each([RoomMode.Online, RoomMode.Campaign])(
    'the processor createWaitingRoom callback navigates with the selected host state for mode %s',
    roomMode => {
      renderRoom(roomMode);
      const createWaitingRoom = (GameClientProcessor as jest.Mock).mock.calls[0][7] as CreateWaitingRoom;
      act(() => createWaitingRoom({} as TemporaryRoomCreationInfo, 98));
      expect(router.location.pathname).toBe('/waiting-room/98');
      expect(router.location.state).toEqual({
        ping: 0,
        hostConfig: roomMode === RoomMode.Campaign ? localHost : remoteHost,
      });
      expect(audio.stop).toHaveBeenCalledTimes(1);
      expect(unloadListeners(removeListener)).toEqual(unloadListeners(addListener));
    },
  );

  test('enter refusal navigates to the lobby and leaves only once on unmount', () => {
    renderRoom();
    const socket = sockets[0];
    const onRefused = socket.on.mock.calls.find(
      ([identifier]) => identifier === GameEventIdentifiers.PlayerEnterRefusedEvent,
    )![1];
    act(() => onRefused());
    expect(router.location.pathname).toBe('/lobby');
    expect(leaveCalls(socket)).toHaveLength(1);
    expect(audio.stop).toHaveBeenCalledTimes(1);
    act(() => window.dispatchEvent(new Event('beforeunload')));
    expect(leaveCalls(socket)).toHaveLength(1);
  });
});
