import { Card } from 'core/cards/card';
import { configure } from 'mobx';
import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { EquipCardItem } from './equip_card_item';

jest.mock('core/game/engine', () => ({ Sanguosha: {} }));
jest.mock('ui/card/card_number', () => ({ CardNumberItem: () => null }));
jest.mock('ui/card/card_suit', () => ({ CardSuitItem: () => null }));
jest.mock('ui/card_description/card_description', () => ({ CardDescription: () => 'description' }));
jest.mock('ui/tooltip/tooltip', () => ({ Tooltip: ({ children }: any) => children }));

describe('equipment actions with the real class observer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    configure({ enforceActions: 'always' });
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    configure({ enforceActions: 'observed' });
  });

  test('selection stays subscribed through its render helper, with async images and delayed tooltips', async () => {
    let resolve!: (image: { src: string }) => void;
    const pending = new Promise<{ src: string }>(done => {
      resolve = done;
    });
    const card = { Name: 'test', is: () => false, isRed: () => false } as unknown as Card;
    const selected = jest.fn();
    const props = {
      card,
      disabled: false,
      onClick: selected,
      translator: { tr: (text: string) => text },
      imageLoader: { getSlimEquipCard: jest.fn(() => pending) },
    } as any;
    act(() => root.render(<EquipCardItem {...props} />));
    expect(container.querySelector('img')).toBeNull();
    await act(async () => {
      resolve({ src: 'equipment.png' });
      await pending;
    });
    expect(container.querySelector('img')!.getAttribute('src')).toBe('equipment.png');

    const item = container.firstElementChild!;
    act(() => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(selected).toHaveBeenLastCalledWith(true);
    expect(item.classList.contains('selected')).toBe(true);
    act(() => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(selected).toHaveBeenLastCalledWith(false);
    expect(item.classList.contains('selected')).toBe(false);

    act(() => {
      item.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(container.textContent).not.toContain('description');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(container.textContent).toContain('description');
    act(() => {
      item.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });
    expect(container.textContent).not.toContain('description');
  });
});
