import * as React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { App } from './app';
import { Lobby } from './pages/lobby/lobby';

// Keep the real App, router, opening page and event emitter. Other pages and
// service factories are not needed to exercise startup, and would load the
// entire game engine, socket clients and browser media APIs in jsdom.
jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'test-version' } }));
jest.mock('audio_loader/audio_loader_util', () => ({ getAudioLoader: () => ({}) }));
jest.mock('image_loader/image_loader_util', () => ({ getImageLoader: () => ({}) }));
jest.mock('services/connection_service/connection_service_util', () => ({ getConnectionService: () => ({}) }));
jest.mock('services/campaign_service/campaign_service', () => ({ CampaignService: class {} }));
jest.mock('pages/characters_list/characters_list', () => ({ CharactersList: () => null }));
jest.mock('pages/room/replay_room', () => ({ ReplayRoomPage: () => null }));
jest.mock('pages/room/room', () => ({ RoomPage: () => null }));
jest.mock('pages/waiting_room/waiting_room', () => ({ WaitingRoom: () => null }));
jest.mock('./pages/lobby/lobby', () => ({ Lobby: () => null }));

type AppProps = React.ComponentProps<typeof App>;

describe('App startup', () => {
  let app: ReactTestRenderer | undefined;
  let props: AppProps;
  let originalTitle: string;
  let originalEventEmitter: unknown;

  beforeEach(() => {
    jest.useFakeTimers();
    originalTitle = document.title;
    originalEventEmitter = (window as any).eventEmitter;
    delete (window as any).eventEmitter;
    props = {
      config: { ui: { language: 'en-US' }, flavor: 'dev', host: [] } as AppProps['config'],
      electronLoader: {} as AppProps['electronLoader'],
      logger: {} as AppProps['logger'],
      translator: { tr: (text: string) => text } as AppProps['translator'],
    };
  });

  afterEach(() => {
    // Unmount while fake timers are active so the real opening page can remove
    // its document listener and cancel its six-second navigation timeout.
    act(() => app?.unmount());
    app = undefined;
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

  function renderApp() {
    act(() => {
      app = create(<App {...props} />);
    });
    return app!;
  }

  test('redirects to the real opening screen and initializes the document', () => {
    const rendered = renderApp();

    expect(rendered.root.findAllByType('img').map(image => image.props.alt)).toEqual(['logo', 'description']);
    for (const image of rendered.root.findAllByType('img')) {
      expect(image.props.src).toEqual(expect.any(String));
      expect(image.props.src).not.toBe('');
    }
    expect(rendered.root.findAllByType(Lobby)).toHaveLength(0);
    expect(document.title).toBe('New QSanguosha - test-version');
    expect((window as any).eventEmitter.on).toEqual(expect.any(Function));
    expect((window as any).eventEmitter.emit).toEqual(expect.any(Function));
  });

  test.each(['click', 'keydown', 'timeout'])('enters the lobby on %s and cleans up opening effects', trigger => {
    const addListener = jest.spyOn(document, 'addEventListener');
    const removeListener = jest.spyOn(document, 'removeEventListener');
    const rendered = renderApp();
    const keydownListener = addListener.mock.calls.find(([event]) => event === 'keydown')![1];

    act(() => {
      if (trigger === 'click') {
        rendered.root.findByProps({ className: 'scene' }).props.onClick();
      } else if (trigger === 'keydown') {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      } else {
        jest.advanceTimersByTime(5999);
        expect(rendered.root.findAllByType(Lobby)).toHaveLength(0);
        jest.advanceTimersByTime(1);
      }
    });

    const lobby = rendered.root.findByType(Lobby);
    expect(lobby.props.config).toBe(props.config);
    expect(lobby.props.electronLoader).toBe(props.electronLoader);
    expect(lobby.props.translator).toBe(props.translator);
    expect(lobby.props.location.pathname).toBe('/lobby');
    expect(rendered.root.findAllByType('img')).toHaveLength(0);
    expect(removeListener).toHaveBeenCalledWith('keydown', keydownListener);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('cancels opening navigation and removes its key listener when unmounted', () => {
    const removeListener = jest.spyOn(document, 'removeEventListener');
    renderApp();
    expect(jest.getTimerCount()).toBe(1);

    act(() => app!.unmount());
    app = undefined;

    expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(jest.getTimerCount()).toBe(0);
  });
});
