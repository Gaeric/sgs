import { GameEventIdentifiers, ServerEventFinder } from 'core/event/event';
import { RoomStore } from 'pages/room/room.store';
import { GuideLine } from './guideline';
import { UiAnimation } from '../ui_animation';

type UseEvent = ServerEventFinder<GameEventIdentifiers.CardUseEvent>;

class TestAnimation extends UiAnimation {
  public wait(time: number, action?: () => void) {
    return this.play(time, action);
  }
}

describe('GuideLine lifecycle', () => {
  let host: HTMLDivElement;
  let animation: GuideLine;

  beforeEach(() => {
    jest.useFakeTimers();
    host = document.createElement('div');
    host.id = 'root';
    document.body.append(host);
    const store = {
      clientPlayerId: 'self',
      animationPosition: {
        getPosition: (id: string) => (id === 'source' ? { x: 10, y: 20 } : { x: 310, y: 420 }),
      },
    } as unknown as RoomStore;
    animation = new GuideLine(store, 200, 1000);
  });

  afterEach(() => {
    animation.dispose();
    host.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function event(steps = 1): UseEvent {
    return {
      animation: Array.from({ length: steps }, () => ({ from: 'source', tos: ['target', 'self'] })),
    } as UseEvent;
  }

  async function advance(time: number) {
    jest.advanceTimersByTime(time);
    await Promise.resolve();
  }

  test('preserves expansion, fading, step timing and eventual removal while mounted', async () => {
    const finished = animation.animate(GameEventIdentifiers.CardUseEvent, event(2));
    const lines = Array.from(host.children) as HTMLElement[];
    const removals = lines.map(line => jest.spyOn(line, 'remove'));
    expect(lines).toHaveLength(2);
    expect(lines[0].style.width).toBe('0px');
    expect(lines[0].style.opacity).toBe('0');
    expect(lines[0].style.left).toBe('10px');
    expect(lines[0].style.top).toBe('20px');
    await advance(99);
    expect(lines[0].style.opacity).toBe('0');
    await advance(1);
    expect(lines[0].style.width).toBe('500px');
    expect(lines[0].style.opacity).toBe('1');
    expect(lines[0].style.transition).toBe('width 200ms, opacity 150ms');
    await advance(249);
    expect(host.children).toHaveLength(2);
    await advance(1);
    expect(host.children).toHaveLength(4);
    await advance(339);
    expect(lines[0].style.opacity).toBe('1');
    await advance(1);
    expect(lines[0].style.opacity).toBe('0');
    expect(lines[0].style.transition).toBe('opacity 300ms');
    await advance(10);
    await finished;
    // animate finishes scheduling steps before the last line's lifetime ends.
    expect(host.children).toHaveLength(4);
    await advance(300);
    expect(host.children).toHaveLength(2);
    for (const remove of removals) {
      expect(remove).toHaveBeenCalledTimes(1);
    }
    await advance(350);
    expect(host.children).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
    animation.dispose();
    for (const remove of removals) {
      expect(remove).toHaveBeenCalledTimes(1);
    }
  });

  test.each([0, 50, 100, 349, 350, 690, 700, 1000])(
    'disposes at %sms, removes each active line once and settles without later steps or styles',
    async time => {
      const finished = animation.animate(GameEventIdentifiers.CardUseEvent, event(3));
      // Flush each sequential step separately, as on the real event loop.
      let elapsed = 0;
      while (elapsed + 350 <= time) {
        await advance(350);
        elapsed += 350;
      }
      await advance(time - elapsed);
      const lines = Array.from(host.children) as HTMLElement[];
      const removals = lines.map(line => jest.spyOn(line, 'remove'));
      const styles = lines.map(line => line.getAttribute('style'));
      const append = jest.spyOn(host, 'append');
      animation.dispose();
      expect(host.children).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
      for (const remove of removals) {
        expect(remove).toHaveBeenCalledTimes(1);
      }
      animation.dispose();
      await finished;
      await animation.animate(GameEventIdentifiers.CardUseEvent, event());
      await animation.animate(GameEventIdentifiers.SkillUseEvent, event());
      jest.runAllTimers();
      expect(append).not.toHaveBeenCalled();
      expect(lines.map(line => line.getAttribute('style'))).toEqual(styles);
      for (const remove of removals) {
        expect(remove).toHaveBeenCalledTimes(1);
      }
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  test('disposes remaining lines after animate has already resolved', async () => {
    const finished = animation.animate(GameEventIdentifiers.SkillUseEvent, event());
    await advance(350);
    await finished;
    expect(host.children).toHaveLength(2);
    expect(jest.getTimerCount()).toBe(3);
    animation.dispose();
    expect(host.children).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('cleans up all concurrent animations and ignores unrelated events', async () => {
    await animation.animate(GameEventIdentifiers.MoveCardEvent, event());
    expect(host.children).toHaveLength(0);
    const first = animation.animate(GameEventIdentifiers.CardUseEvent, event(2));
    const second = animation.animate(GameEventIdentifiers.SkillUseEvent, event(2));
    expect(host.children).toHaveLength(4);
    animation.dispose();
    await Promise.all([first, second]);
    expect(host.children).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('UiAnimation tracked timers', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('resolves every canceled wait immediately without advancing time or executing callbacks', async () => {
    const animation = new TestAnimation();
    const action = jest.fn();
    const waits = [animation.wait(100, action), animation.wait(1000, action), animation.wait(150)];
    expect(jest.getTimerCount()).toBe(3);
    animation.dispose();
    animation.dispose();
    expect(jest.getTimerCount()).toBe(0);
    await Promise.all(waits);
    await animation.wait(100, action);
    expect(action).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('rejects action failures and removes the finished timer from tracking', async () => {
    const animation = new TestAnimation();
    const failure = new Error('frame failed');
    const wait = animation.wait(100, () => {
      throw failure;
    });
    const rejected = expect(wait).rejects.toBe(failure);
    jest.advanceTimersByTime(100);
    await rejected;
    animation.dispose();
    expect(jest.getTimerCount()).toBe(0);
  });
});
