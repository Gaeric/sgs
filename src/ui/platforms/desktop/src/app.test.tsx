import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App } from './app';

// Exercise the real App, router, opening page and event emitter, without
// loading the entire engine, socket clients and browser media services.
jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'test-version' } }));
jest.mock('audio_loader/audio_loader_util', () => ({ getAudioLoader: () => ({}) }));
jest.mock('image_loader/image_loader_util', () => ({ getImageLoader: () => ({}) }));
jest.mock('services/connection_service/connection_service_util', () => ({ getConnectionService: () => ({}) }));
jest.mock('services/campaign_service/campaign_service', () => ({ CampaignService: class {} }));
jest.mock('pages/characters_list/characters_list', () => ({ CharactersList: () => null }));
jest.mock('pages/room/replay_room', () => ({ ReplayRoomPage: () => null }));
jest.mock('pages/room/room', () => ({ RoomPage: () => null }));
jest.mock('pages/waiting_room/waiting_room', () => ({ WaitingRoom: () => null }));
const mockLobbyProps = jest.fn();
jest.mock('./pages/lobby/lobby', () => ({
  Lobby: (props: unknown) => {
    mockLobbyProps(props);
    return <div data-testid="lobby" />;
  },
}));

type AppProps = React.ComponentProps<typeof App>;

describe('App startup with a React 18 DOM root', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;
  let props: AppProps;
  let originalTitle: string;
  let originalEventEmitter: unknown;

  beforeEach(() => {
    jest.useFakeTimers();
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

  function renderApp() {
    act(() => root!.render(<App {...props} />));
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
    const lobbyProps = mockLobbyProps.mock.calls[mockLobbyProps.mock.calls.length - 1][0];
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
});
