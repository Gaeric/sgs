import { CardType } from 'core/cards/card';
import { CardMoveArea, CardMoveReason, GameEventIdentifiers, ServerEventFinder } from 'core/event/event';
import { Sanguosha } from 'core/game/engine';
import { TargetGroupUtil } from 'core/shares/libs/utils/target_group';
import { ClientTranslationModule } from 'core/translations/translation_module.client';
import { ImageLoader } from 'image_loader/image_loader';
import { RoomStore } from 'pages/room/room.store';
import { act } from 'react';
import { Root } from 'react-dom/client';
import { MoveInstantCardAnimation } from './move_instant_card';
import { UiAnimation } from '../ui_animation';

const mockCardMount = jest.fn();
const mockCardUnmount = jest.fn();

jest.mock('core/cards/card', () => ({ CardType: { Equip: 1 } }));
jest.mock('core/game/engine', () => ({ Sanguosha: { getCardById: jest.fn() } }));
jest.mock('core/shares/libs/utils/target_group', () => ({ TargetGroupUtil: { getRealTargets: jest.fn() } }));
jest.mock('ui/card/card', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    ClientCard: ({ card, style }: any) => {
      const ref = React.useRef<HTMLSpanElement>(null);
      React.useEffect(() => {
        mockCardMount();
        // React removes the card DOM before passive effect cleanup. The temporary
        // container, however, must stay connected until root.unmount completes.
        const container = ref.current!.parentElement!.parentElement!;
        return () => mockCardUnmount(container.isConnected);
      }, []);
      return React.createElement('span', { ref, style, 'data-card': card?.Id ?? 'hidden' });
    },
  };
});

type MoveEvent = ServerEventFinder<GameEventIdentifiers.MoveCardEvent>;
type UseEvent = ServerEventFinder<GameEventIdentifiers.CardUseEvent>;

describe('MoveInstantCardAnimation React roots', () => {
  let host: HTMLDivElement;
  let animation: MoveInstantCardAnimation;
  let roots: Root[];
  let previousActEnvironment: unknown;

  beforeEach(() => {
    jest.useFakeTimers();
    previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    host.id = 'root';
    document.body.append(host);
    roots = [];
    const client = jest.requireActual<typeof import('react-dom/client')>('react-dom/client');
    const createRoot = client.createRoot;
    jest.spyOn(client, 'createRoot').mockImplementation(container => {
      const root = createRoot(container);
      jest.spyOn(root, 'render');
      jest.spyOn(root, 'unmount');
      roots.push(root);
      return root;
    });
    (Sanguosha.getCardById as jest.Mock).mockImplementation(id => ({
      Id: id,
      is: (type: CardType) => type === CardType.Equip,
    }));
    (TargetGroupUtil.getRealTargets as jest.Mock).mockReturnValue(['source']);
    const store = {
      clientPlayerId: 'self',
      animationPosition: {
        getPosition: (id: string) => (id === 'source' ? { x: 200, y: 300 } : { x: 500, y: 600 }),
      },
    } as unknown as RoomStore;
    animation = new MoveInstantCardAnimation(store, {} as ClientTranslationModule, {} as ImageLoader);
  });

  afterEach(() => {
    act(() => {
      animation.dispose();
      for (const root of roots) {
        if (!(root.unmount as jest.Mock).mock.calls.length) {
          root.unmount();
        }
      }
    });
    host.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  function moveEvent(): MoveEvent {
    return {
      infos: [
        {
          fromId: 'source',
          toId: 'destination',
          toArea: CardMoveArea.HandArea,
          moveReason: CardMoveReason.ActiveMove,
          movingCards: [
            { card: 1, fromArea: CardMoveArea.EquipArea },
            { card: 2, fromArea: CardMoveArea.HandArea },
          ],
        },
      ],
    } as MoveEvent;
  }

  function useEvent(): UseEvent {
    return { fromId: 'source', cardId: 1, targetGroup: [['source']] } as UseEvent;
  }

  function start(identifier: GameEventIdentifiers, event: MoveEvent | UseEvent) {
    let finished!: Promise<void>;
    act(() => {
      finished = animation.animate(identifier, event);
      // This assertion is inside act: the initial frame must commit synchronously,
      // not just when act eventually flushes concurrent work.
      expect(host.querySelector('.movingCards')).not.toBeNull();
    });
    return finished;
  }

  async function advance(time: number) {
    await act(async () => {
      jest.advanceTimersByTime(time);
    });
  }

  test('reuses a real root for move frames, preserves card visibility/offsets and unmounts before removal', async () => {
    const finished = start(GameEventIdentifiers.MoveCardEvent, moveEvent());
    const container = host.firstElementChild!;
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.style.transform).toBe('translate(132px, 220px)');
    expect(frame.style.opacity).toBe('');
    expect(Array.from(frame.children).map(card => card.getAttribute('data-card'))).toEqual(['1', 'hidden']);
    expect((frame.children[1] as HTMLElement).style.transform).toBe('translate(-104px, 0)');
    expect(roots).toHaveLength(1);

    await advance(99);
    expect(frame.style.opacity).toBe('');
    await advance(1);
    expect(container.firstElementChild).toBe(frame);
    expect(frame.style.transform).toBe('translate(432px, 600px)');
    expect(frame.style.opacity).toBe('1');
    await advance(999);
    expect(frame.style.opacity).toBe('1');
    await advance(1);
    expect(frame.style.opacity).toBe('0');
    expect(frame.style.transform).toBe('');
    await advance(149);
    expect(container.isConnected).toBe(true);
    await advance(1);
    await finished;

    expect(roots[0].render).toHaveBeenCalledTimes(3);
    expect(roots[0].unmount).toHaveBeenCalledTimes(1);
    expect(mockCardMount).toHaveBeenCalledTimes(2);
    expect(mockCardUnmount.mock.calls).toEqual([[true], [true]]);
    expect(container.childNodes).toHaveLength(0);
    expect(host.childNodes).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('renders equipment use with the same frame timings and cleans up its real root', async () => {
    const finished = start(GameEventIdentifiers.CardUseEvent, useEvent());
    const container = host.firstElementChild!;
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.style.transform).toBe('translate(140px, 220px)');
    expect(frame.querySelector('[data-card="1"]')).not.toBeNull();
    await advance(100);
    expect(frame.style.opacity).toBe('1');
    expect(frame.style.transform).toBe('translate(140px, 220px)');
    await advance(1000);
    expect(frame.style.opacity).toBe('0');
    expect(frame.style.transform).toBe('');
    await advance(150);
    await finished;
    expect(roots).toHaveLength(1);
    expect(roots[0].render).toHaveBeenCalledTimes(3);
    expect(roots[0].unmount).toHaveBeenCalledTimes(1);
    expect(mockCardMount).toHaveBeenCalledTimes(1);
    expect(mockCardUnmount).toHaveBeenCalledWith(true);
    expect(container.childNodes).toHaveLength(0);
    expect(host.childNodes).toHaveLength(0);
  });

  test('creates and disposes a separate root for each sequential move container', async () => {
    const event = moveEvent();
    event.infos.push({ ...event.infos[0] });
    const finished = start(GameEventIdentifiers.MoveCardEvent, event);
    const first = host.firstElementChild!;
    for (const time of [100, 1000, 150]) {
      await advance(time);
    }
    expect(first.isConnected).toBe(false);
    expect(first.childNodes).toHaveLength(0);
    expect(host.children).toHaveLength(1);
    expect(roots).toHaveLength(2);
    for (const time of [100, 1000, 150]) {
      await advance(time);
    }
    await finished;
    for (const root of roots) {
      expect(root.render).toHaveBeenCalledTimes(3);
      expect(root.unmount).toHaveBeenCalledTimes(1);
    }
    expect(host.childNodes).toHaveLength(0);
  });

  test.each([GameEventIdentifiers.MoveCardEvent, GameEventIdentifiers.CardUseEvent])(
    'unmounts and removes the container if animation %s rejects',
    async identifier => {
      const failure = new Error('animation interrupted');
      jest.spyOn(UiAnimation.prototype as any, 'play').mockRejectedValueOnce(failure);
      const finished = start(identifier, identifier === GameEventIdentifiers.MoveCardEvent ? moveEvent() : useEvent());
      const container = host.firstElementChild!;
      await act(async () => {
        await expect(finished).rejects.toBe(failure);
      });
      expect(roots[0].unmount).toHaveBeenCalledTimes(1);
      expect(mockCardUnmount).toHaveBeenCalledWith(true);
      expect(container.childNodes).toHaveLength(0);
      expect(host.childNodes).toHaveLength(0);
    },
  );

  describe.each([GameEventIdentifiers.MoveCardEvent, GameEventIdentifiers.CardUseEvent])(
    'disposing animation %s',
    identifier => {
      test.each([0, 50, 100, 1100, 1249])(
        'synchronously cleans up at %sms and settles without new frames',
        async time => {
          const event = identifier === GameEventIdentifiers.MoveCardEvent ? moveEvent() : useEvent();
          if ('infos' in event) {
            event.infos.push({ ...event.infos[0] });
          }
          const finished = start(identifier, event);
          const container = host.firstElementChild!;
          const remove = jest.spyOn(container, 'remove');
          if (time >= 100) {
            await advance(100);
          }
          if (time >= 1100) {
            await advance(1000);
          }
          const elapsed = time >= 1100 ? 1100 : time >= 100 ? 100 : 0;
          await advance(time - elapsed);
          const renders = (roots[0].render as jest.Mock).mock.calls.length;
          expect(jest.getTimerCount()).toBe(1);

          act(() => {
            animation.dispose();
            // Cleanup must happen immediately, before pending promises resume.
            expect(roots[0].unmount).toHaveBeenCalledTimes(1);
            expect(container.isConnected).toBe(false);
            expect(container.childNodes).toHaveLength(0);
            expect(host.childNodes).toHaveLength(0);
            expect(jest.getTimerCount()).toBe(0);
            animation.dispose();
          });
          await act(async () => {
            await finished;
            await animation.animate(identifier, event);
            await animation.animateCardUse(useEvent());
            jest.runAllTimers();
          });

          expect(roots).toHaveLength(1);
          expect(remove).toHaveBeenCalledTimes(1);
          expect(roots[0].render).toHaveBeenCalledTimes(renders);
          expect(roots[0].unmount).toHaveBeenCalledTimes(1);
          expect(mockCardUnmount.mock.calls.every(([connected]) => connected)).toBe(true);
          expect(jest.getTimerCount()).toBe(0);
          expect(host.childNodes).toHaveLength(0);
        },
      );
    },
  );

  test.each([GameEventIdentifiers.MoveCardEvent, GameEventIdentifiers.CardUseEvent])(
    'cancels animation %s after a frame fires but before its continuation resumes',
    async identifier => {
      const finished = start(identifier, identifier === GameEventIdentifiers.MoveCardEvent ? moveEvent() : useEvent());
      act(() => {
        jest.advanceTimersByTime(100);
        animation.dispose();
      });
      await act(async () => {
        await finished;
      });
      expect(roots[0].render).toHaveBeenCalledTimes(2);
      expect(roots[0].unmount).toHaveBeenCalledTimes(1);
      expect(host.childNodes).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  test('disposes all concurrently active roots without double unmounting in finally', async () => {
    const move = start(GameEventIdentifiers.MoveCardEvent, moveEvent());
    const use = start(GameEventIdentifiers.CardUseEvent, useEvent());
    expect(roots).toHaveLength(2);
    await advance(100);
    act(() => {
      animation.dispose();
      expect(host.childNodes).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
      for (const root of roots) {
        expect(root.unmount).toHaveBeenCalledTimes(1);
      }
    });
    await act(async () => {
      await Promise.all([move, use]);
    });
    for (const root of roots) {
      expect(root.render).toHaveBeenCalledTimes(2);
      expect(root.unmount).toHaveBeenCalledTimes(1);
    }
  });

  test('still disposes every root if one unmount reports a cleanup failure', async () => {
    const move = start(GameEventIdentifiers.MoveCardEvent, moveEvent());
    const use = start(GameEventIdentifiers.CardUseEvent, useEvent());
    const failure = new Error('cleanup failed');
    const unmount = (roots[0].unmount as jest.Mock).getMockImplementation()!;
    (roots[0].unmount as jest.Mock).mockImplementationOnce(() => {
      unmount.call(roots[0]);
      throw failure;
    });
    act(() => {
      expect(() => animation.dispose()).toThrow(failure);
      expect(host.childNodes).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    });
    await act(async () => {
      await Promise.all([move, use]);
    });
    for (const root of roots) {
      expect(root.unmount).toHaveBeenCalledTimes(1);
    }
    expect(() => animation.dispose()).not.toThrow();
  });

  test('does not allocate roots for skipped moves or local card uses', async () => {
    const event = moveEvent();
    event.infos[0].toArea = CardMoveArea.ProcessingArea;
    await animation.animate(GameEventIdentifiers.MoveCardEvent, event);
    await animation.animate(GameEventIdentifiers.CardUseEvent, { ...useEvent(), fromId: 'self' });
    expect(roots).toHaveLength(0);
    expect(host.childNodes).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });
});
