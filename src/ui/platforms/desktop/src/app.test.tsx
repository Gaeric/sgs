import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  Location,
  MemoryRouter,
  NavigateFunction,
  Params,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';
import { App } from './app';

// Exercise the real App, router, opening page and event emitter, without
// loading the entire engine, socket clients and browser media services.
jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'test-version' } }));
jest.mock('audio_loader/audio_loader_util', () => ({ getAudioLoader: () => ({}) }));
jest.mock('image_loader/image_loader_util', () => ({ getImageLoader: () => ({}) }));
jest.mock('services/connection_service/connection_service_util', () => ({ getConnectionService: () => ({}) }));
jest.mock('services/campaign_service/campaign_service', () => ({ CampaignService: class {} }));
jest.mock('pages/characters_list/characters_list', () => ({
  CharactersList: (props: MockPageProps) => mockRenderPage('characters', props),
}));
jest.mock('pages/room/replay_room', () => ({
  ReplayRoomPage: (props: MockPageProps) => mockRenderPage('replay', props),
}));
jest.mock('pages/room/room', () => ({ RoomPage: (props: MockPageProps) => mockRenderPage('room', props) }));
jest.mock('pages/waiting_room/waiting_room', () => ({
  WaitingRoom: (props: MockPageProps) => mockRenderPage('waiting-room', props),
}));
jest.mock('./pages/lobby/lobby', () => ({ Lobby: (props: MockPageProps) => mockRenderPage('lobby', props) }));

type AppProps = React.ComponentProps<typeof App>;
type MockPageProps = {
  navigate: NavigateFunction;
  location: Location;
  params: Readonly<Params<string>>;
  getCurrentLocation: () => Location;
  [key: string]: any;
};
const mockPageProps = jest.fn();
const mockMount = jest.fn();
const mockCleanup = jest.fn();

class MockPage extends React.Component<{ name: string; routeProps: MockPageProps }> {
  componentDidMount() {
    mockMount(this.props.name, this.props.routeProps);
  }

  componentWillUnmount() {
    // Characters uses this at unmount to decide whether the next page owns BGM.
    mockCleanup(this.props.name, this.props.routeProps.getCurrentLocation());
  }

  render() {
    mockPageProps(this.props.name, this.props.routeProps);
    return <div data-testid={this.props.name} />;
  }
}

function mockRenderPage(name: string, routeProps: MockPageProps) {
  return <MockPage name={name} routeProps={routeProps} />;
}

const hostConfig = { host: 'localhost', protocol: 'http', port: 8080, hostTag: 'localhost' };
const replayData = {
  roomId: 42,
  viewerId: 'viewer-id',
  viewerName: 'Viewer',
  version: 'test-version',
  gameInfo: { gameMode: 0 },
  playersInfo: [],
  events: [],
};

describe('App with a React 19 DOM root and an external MemoryRouter', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;
  let props: AppProps;
  let originalTitle: string;
  let originalEventEmitter: unknown;
  let router: { navigate: NavigateFunction; location: Location; action: string };

  function RouterProbe() {
    router = { navigate: useNavigate(), location: useLocation(), action: useNavigationType() };
    return null;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    originalTitle = document.title;
    originalEventEmitter = (window as any).eventEmitter;
    delete (window as any).eventEmitter;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    props = {
      config: { ui: { language: 'en-US' }, flavor: 'dev', host: [] } as AppProps['config'],
      electronLoader: {} as AppProps['electronLoader'],
      logger: {} as AppProps['logger'],
      translator: { tr: (text: string) => text } as AppProps['translator'],
    };
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    container.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.title = originalTitle;
    if (originalEventEmitter === undefined) {
      delete (window as any).eventEmitter;
    } else {
      (window as any).eventEmitter = originalEventEmitter;
    }
  });

  function renderApp(
    initialEntries: React.ComponentProps<typeof MemoryRouter>['initialEntries'] = ['/'],
    initialIndex?: number,
  ) {
    act(() =>
      root!.render(
        <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
          <RouterProbe />
          <App {...props} />
        </MemoryRouter>,
      ),
    );
  }

  function page(name: string): MockPageProps {
    const calls = mockPageProps.mock.calls.filter(([pageName]) => pageName === name);
    expect(calls.length).toBeGreaterThan(0);
    return calls[calls.length - 1][1];
  }

  function navigateFrom(name: string, pathname: string, state?: unknown) {
    act(() => page(name).navigate(pathname, { state }));
  }

  test('redirects to the real opening screen and initializes the document', () => {
    renderApp();

    const images = Array.from(container.querySelectorAll('img'));
    expect(images.map(image => image.alt)).toEqual(['logo', 'description']);
    for (const image of images) {
      expect(image.getAttribute('src')).toEqual(expect.any(String));
      expect(image.getAttribute('src')).not.toBe('');
    }
    expect(container.querySelector('[data-testid="lobby"]')).toBeNull();
    expect(router.location.pathname).toBe('/openning');
    expect(router.action).toBe('REPLACE');
    expect(document.title).toBe('New QSanguosha - test-version');
    expect((window as any).eventEmitter.on).toEqual(expect.any(Function));
    expect((window as any).eventEmitter.emit).toEqual(expect.any(Function));
  });

  test.each(['click', 'keydown', 'timeout'])('enters the lobby on %s and cleans up opening effects', trigger => {
    const addListener = jest.spyOn(document, 'addEventListener');
    const removeListener = jest.spyOn(document, 'removeEventListener');
    renderApp();
    const keydownListener = addListener.mock.calls.find(([event]) => event === 'keydown')![1];

    if (trigger === 'timeout') {
      act(() => jest.advanceTimersByTime(5999));
      expect(container.querySelector('[data-testid="lobby"]')).toBeNull();
    }
    act(() => {
      if (trigger === 'click') {
        container.querySelector('.scene')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      } else if (trigger === 'keydown') {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      } else {
        jest.advanceTimersByTime(1);
      }
    });

    expect(container.querySelector('[data-testid="lobby"]')).not.toBeNull();
    const lobbyProps = page('lobby');
    expect(lobbyProps.config).toBe(props.config);
    expect(lobbyProps.electronLoader).toBe(props.electronLoader);
    expect(lobbyProps.translator).toBe(props.translator);
    expect(lobbyProps.location.pathname).toBe('/lobby');
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(removeListener).toHaveBeenCalledWith('keydown', keydownListener);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('unmounts its DOM, cancels opening navigation and removes its key listener', () => {
    const removeListener = jest.spyOn(document, 'removeEventListener');
    renderApp();
    expect(jest.getTimerCount()).toBe(1);

    act(() => root!.unmount());
    root = undefined;

    expect(container.childNodes).toHaveLength(0);
    expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(jest.getTimerCount()).toBe(0);
  });

  test('passes Router 7 page props and preserves state references through lobby, waiting room and room', () => {
    renderApp(['/lobby']);
    const lobby = page('lobby');
    expect(lobby.navigate).toEqual(expect.any(Function));
    expect(lobby.params).toEqual({});
    expect(lobby.getCurrentLocation()).toBe(lobby.location);
    expect(lobby.history).toBeUndefined();
    expect(lobby.match).toBeUndefined();

    const roomInfo = { gameMode: 0, roomName: 'Online room' };
    const waitingState = { hostConfig, ping: 23, roomInfo };
    navigateFrom('lobby', '/waiting-room/42', waitingState);
    const waiting = page('waiting-room');
    expect(waiting.params).toEqual({ slug: '42' });
    expect(waiting.location.state).toBe(waitingState);
    expect(waiting.location.state.hostConfig).toBe(hostConfig);
    expect(waiting.location.state.roomInfo).toBe(roomInfo);
    expect(waiting.location.state.ping).toBe(23);

    const roomState = { hostConfig, ping: 23, roomMode: 0, gameMode: 0 };
    navigateFrom('waiting-room', '/room/42', roomState);
    const room = page('room');
    expect(room.params).toEqual({ slug: '42' });
    expect(room.location.state).toBe(roomState);
    expect(room.location.state.hostConfig).toBe(hostConfig);
    expect(room.getConnectionService(false)).not.toBe(room.getConnectionService(true));

    navigateFrom('room', '/waiting-room/42', waitingState);
    expect(page('waiting-room').location.state).toBe(waitingState);
    expect(mockMount.mock.calls.filter(([name]) => name === 'waiting-room')).toHaveLength(2);
    expect(mockCleanup).toHaveBeenCalledWith('room', expect.objectContaining({ pathname: '/waiting-room/42' }));
  });

  test.each([
    ['observer', { hostConfig, ping: 7, roomMode: 2, gameMode: 0 }],
    ['campaign', { roomMode: 1, gameMode: 3, hostPlayerId: 'host-player', roomName: 'Campaign' }],
  ])('retains %s room state without cloning it', (_mode, state) => {
    renderApp(['/lobby']);
    navigateFrom('lobby', '/room/0', state);
    expect(page('room').params.slug).toBe('0');
    expect(page('room').location.state).toBe(state);
    expect(page('room').location.state.gameMode).toBe(state.gameMode);
    expect(container.querySelector('[data-testid="lobby"]')).toBeNull();
  });

  test('passes replay data by reference to the replay page', () => {
    renderApp(['/lobby']);
    const state = { replayData };
    navigateFrom('lobby', '/replay', state);
    expect(page('replay').location.state).toBe(state);
    expect(page('replay').location.state.replayData).toBe(replayData);
    expect(page('replay').params).toEqual({});
  });

  test.each([
    ['waiting-room', { hostConfig }],
    ['room', { hostConfig, roomMode: 0 }],
  ])('remounts %s when only the slug changes and exposes the destination during cleanup', (name, state) => {
    renderApp([{ pathname: `/${name}/42`, state }]);
    const oldPage = page(name);
    const oldLocation = oldPage.location;
    navigateFrom(name, `/${name}/43`, state);

    expect(page(name).params.slug).toBe('43');
    expect(mockMount.mock.calls.filter(([pageName]) => pageName === name)).toHaveLength(2);
    expect(mockCleanup).toHaveBeenCalledWith(name, expect.objectContaining({ pathname: `/${name}/43` }));
    expect(oldPage.location).toBe(oldLocation);
    expect(oldPage.location.pathname).toBe(`/${name}/42`);
    expect(oldPage.getCurrentLocation().pathname).toBe(`/${name}/43`);
  });

  test('outgoing lobby can preserve BGM for the characters destination', () => {
    renderApp(['/lobby']);
    const lobby = page('lobby');
    navigateFrom('lobby', '/characters');

    expect(lobby.location.pathname).toBe('/lobby');
    expect(lobby.getCurrentLocation().pathname).toBe('/characters');
    expect(mockCleanup).toHaveBeenCalledWith('lobby', expect.objectContaining({ pathname: '/characters' }));
  });

  test.each(['/lobby', '/room/42'])(
    'characters cleanup can read destination %s instead of its stale location',
    destination => {
      renderApp(['/characters']);
      const characters = page('characters');
      const state = destination.startsWith('/room') ? { hostConfig, roomMode: 0 } : undefined;
      navigateFrom('characters', `${destination}?from=characters#music`, state);

      expect(characters.location.pathname).toBe('/characters');
      expect(characters.getCurrentLocation()).toBe(router.location);
      expect(mockCleanup).toHaveBeenCalledWith(
        'characters',
        expect.objectContaining({
          pathname: destination,
          search: '?from=characters',
          hash: '#music',
          state: state || null,
        }),
      );
    },
  );

  test('supports back and forward with original state references and params', () => {
    renderApp(['/lobby']);
    const state = { hostConfig, ping: 9 };
    navigateFrom('lobby', '/waiting-room/42', state);
    navigateFrom('waiting-room', '/characters');

    act(() => router.navigate(-1));
    expect(page('waiting-room').params.slug).toBe('42');
    expect(page('waiting-room').location.state).toBe(state);
    expect(router.action).toBe('POP');
    act(() => router.navigate(-1));
    expect(router.location.pathname).toBe('/lobby');
    act(() => router.navigate(1));
    expect(page('waiting-room').location.state).toBe(state);
    act(() => router.navigate(1));
    expect(router.location.pathname).toBe('/characters');
  });

  test.each([
    ['/waiting-room/42', undefined],
    ['/waiting-room/42', {}],
    ['/waiting-room/42', { hostConfig: null }],
    ['/waiting-room/42', { hostConfig: { ...hostConfig, host: 7 } }],
    ['/waiting-room/42', { hostConfig: { ...hostConfig, protocol: 'ftp' } }],
    ['/waiting-room/42', { hostConfig: { ...hostConfig, port: 0 } }],
    ['/waiting-room/42', { hostConfig: { ...hostConfig, port: -1 } }],
    ['/waiting-room/42', { hostConfig: { ...hostConfig, port: Infinity } }],
    ['/waiting-room/42', { hostConfig: { ...hostConfig, port: NaN } }],
    ['/waiting-room/42', { hostConfig: { ...hostConfig, port: '8080' } }],
    ['/waiting-room/42', { hostConfig: { ...hostConfig, hostTag: undefined } }],
    ['/room/42', undefined],
    ['/room/42', { hostConfig }],
    ['/room/42', { hostConfig, roomMode: 3 }],
    ['/room/42', { hostConfig, roomMode: '0' }],
    ['/room/42', { roomMode: 0 }],
    ['/room/42', { roomMode: 2 }],
    ['/room/42', { roomMode: 0, hostConfig: { ...hostConfig, protocol: 'ftp' } }],
    ['/replay', undefined],
    ['/replay', {}],
    ['/replay', { replayData: null }],
    ['/replay', { replayData: {} }],
    ['/not-a-route', undefined],
  ])('replaces invalid route %s with lobby without mounting the guarded page (state %j)', (pathname, state) => {
    renderApp([{ pathname, state }]);
    expect(router.location.pathname).toBe('/lobby');
    expect(router.action).toBe('REPLACE');
    expect(mockMount.mock.calls.map(([name]) => name)).toEqual(['lobby']);
  });

  test.each(['waiting-room', 'room'])('%s rejects invalid slugs before mounting a page', route => {
    const state = { hostConfig, roomMode: 0 };
    renderApp(['/lobby']);
    for (const slug of ['-1', '1.5', 'NaN', 'Infinity', 'room-name', '9007199254740992']) {
      act(() => router.navigate(`/${route}/${slug}`, { state }));
      expect(router.location.pathname).toBe('/lobby');
      expect(router.action).toBe('REPLACE');
    }
    expect(mockMount.mock.calls.every(([name]) => name === 'lobby')).toBe(true);
  });

  test('fallback replaces its history entry so back/forward never revisit the invalid route', () => {
    renderApp(['/characters']);
    navigateFrom('characters', '/room/not-a-number', { hostConfig, roomMode: 0 });
    expect(router.location.pathname).toBe('/lobby');
    expect(router.action).toBe('REPLACE');
    act(() => router.navigate(-1));
    expect(router.location.pathname).toBe('/characters');
    act(() => router.navigate(1));
    expect(router.location.pathname).toBe('/lobby');
    expect(router.action).toBe('POP');
    expect(mockMount.mock.calls.some(([name]) => name === 'room')).toBe(false);
  });
});
