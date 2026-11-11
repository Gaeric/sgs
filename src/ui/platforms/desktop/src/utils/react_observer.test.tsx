import { makeObservable, observable, onBecomeObserved, onBecomeUnobserved, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

class ObserverStore {
  @observable
  value = 'original';

  constructor() {
    makeObservable(this);
  }
}

type ObserverProps = { label: string };

// Match the legacy decorators and PureComponent pattern used by desktop views.
@observer
class ObserverView extends React.PureComponent<ObserverProps> {
  @observable
  count = 0;

  @observable.ref
  store = new ObserverStore();

  @observable.shallow
  rows = [{ name: 'Alice' }];

  constructor(props: ObserverProps) {
    super(props);
    makeObservable(this);
  }

  render() {
    return (
      <div>
        <span data-testid="count">{`${this.props.label}:${this.count}`}</span>
        <span data-testid="store">{this.store.value}</span>
        <span data-testid="rows">{this.rows.map(row => row.name).join(',')}</span>
      </div>
    );
  }
}

describe('MobX class observers with a React 19 root', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let view: React.RefObject<ObserverView | null>;
  let disposers: (() => void)[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    view = React.createRef<ObserverView>();
    disposers = [];
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    disposers.forEach(dispose => dispose());
    container.remove();
  });

  function renderView(label = 'Count') {
    act(() => root!.render(<ObserverView ref={view} label={label} />));
    return view.current!;
  }

  function text(field: string) {
    return container.querySelector(`[data-testid="${field}"]`)!.textContent;
  }

  test('renders legacy observable fields and responds to actions and prop changes on PureComponent', () => {
    const instance = renderView();
    expect(text('count')).toBe('Count:0');
    expect(text('store')).toBe('original');
    expect(text('rows')).toBe('Alice');

    act(() => {
      runInAction(() => {
        instance.count += 1;
        instance.count += 1;
        instance.store.value = 'updated';
      });
    });
    expect(text('count')).toBe('Count:2');
    expect(text('store')).toBe('updated');

    renderView('Total');
    expect(view.current).toBe(instance);
    expect(text('count')).toBe('Total:2');

    act(() => {
      runInAction(() => {
        instance.count += 1;
      });
    });
    expect(text('count')).toBe('Total:3');
  });

  test('retracks an observable.ref store replacement and releases the previous store', () => {
    const instance = renderView();
    const original = instance.store;
    const replacement = new ObserverStore();
    replacement.value = 'replacement';
    const originalUnobserved = jest.fn();
    const replacementObserved = jest.fn();
    disposers.push(
      onBecomeUnobserved(original, 'value', originalUnobserved),
      onBecomeObserved(replacement, 'value', replacementObserved),
    );

    act(() => {
      runInAction(() => {
        instance.store = replacement;
      });
    });
    expect(instance.store).toBe(replacement);
    expect(text('store')).toBe('replacement');
    expect(originalUnobserved).toHaveBeenCalledTimes(1);
    expect(replacementObserved).toHaveBeenCalledTimes(1);

    act(() => {
      runInAction(() => {
        original.value = 'stale';
      });
    });
    expect(text('store')).toBe('replacement');

    act(() => {
      runInAction(() => {
        replacement.value = 'current';
      });
    });
    expect(text('store')).toBe('current');
  });

  test('tracks shallow array changes without making plain row fields reactive', () => {
    const instance = renderView();
    const row = instance.rows[0];

    act(() => {
      runInAction(() => {
        row.name = 'Bob';
      });
    });
    expect(instance.rows[0]).toBe(row);
    expect(text('rows')).toBe('Alice');

    act(() => {
      runInAction(() => {
        instance.rows.push({ name: 'Carol' });
      });
    });
    expect(text('rows')).toBe('Bob,Carol');

    act(() => {
      runInAction(() => {
        instance.rows = [{ name: 'Dave' }];
      });
    });
    expect(text('rows')).toBe('Dave');
  });

  test('unmount releases the render reaction and does not resubscribe on later actions', () => {
    const instance = renderView();
    const store = instance.store;
    const unobserved = jest.fn();
    const observedAgain = jest.fn();
    // Public MobX lifecycle hooks check disposal without inspecting React or MobX internals.
    for (const field of ['count', 'store', 'rows']) {
      disposers.push(onBecomeUnobserved(instance, field, unobserved), onBecomeObserved(instance, field, observedAgain));
    }
    disposers.push(onBecomeUnobserved(store, 'value', unobserved), onBecomeObserved(store, 'value', observedAgain));

    act(() => root!.unmount());
    root = undefined;
    expect(view.current).toBeNull();
    expect(container.childNodes).toHaveLength(0);
    expect(unobserved).toHaveBeenCalledTimes(4);

    act(() => {
      runInAction(() => {
        instance.count += 1;
        store.value = 'after unmount';
        instance.rows.push({ name: 'unmounted' });
        instance.store = new ObserverStore();
      });
    });
    expect(container.childNodes).toHaveLength(0);
    expect(observedAgain).not.toHaveBeenCalled();
    expect(unobserved).toHaveBeenCalledTimes(4);
  });
});
