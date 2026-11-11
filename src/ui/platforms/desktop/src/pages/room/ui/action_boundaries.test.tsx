import { Card } from 'core/cards/card';
import { Sanguosha } from 'core/game/engine';
import { Skill } from 'core/skills/skill';
import { autorun, configure, isObservable, observable, runInAction } from 'mobx';
import { ClientCard } from 'ui/card/card';
import { FlatClientCard } from 'ui/card/flat_card';
import { EquipCardItem } from './dashboard/equip_card_item/equip_card_item';
import { GuanXingCardSlots } from './dialog/guanxing_dialog/guanxing_dialog';
import { MessageDialog } from './message_dialog/message_dialog';
import { PlayerCard } from './player/player';
import { PlayerAvatar } from './player_avatar/player_avatar';

// Unit-test the real MobX decorators and callbacks without React's observer
// lifecycle wrapper; render tracking is covered separately by a mounted test.
jest.mock('mobx-react', () => ({ observer: (Component: unknown) => Component }));
jest.mock('core/game/engine', () => ({ Sanguosha: { getCharacterById: jest.fn() } }));
jest.mock('ui/card_description/card_description', () => ({ CardDescription: () => null }));
jest.mock('ui/button/skill_button', () => ({ SkillButton: () => null }));
jest.mock('./mark/mark', () => ({ Mark: () => null }));

describe('room UI action boundaries', () => {
  beforeEach(() => {
    configure({ enforceActions: 'always' });
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    configure({ enforceActions: 'observed' });
  });

  test.each([ClientCard, FlatClientCard, EquipCardItem, PlayerCard, PlayerAvatar])(
    '%p opens tooltips from a timer action and cancels closed tooltips',
    Component => {
      const view = new (Component as any)({ card: { Name: 'test' } });
      const seen: boolean[] = [];
      const dispose = autorun(() => seen.push(view.onTooltipOpened));
      try {
        view.openTooltip({});
        expect(seen).toEqual([false]);
        jest.runOnlyPendingTimers();
        expect(seen).toEqual([false, true]);
        view.closeTooltip({});
        view.openTooltip({});
        view.closeTooltip({});
        jest.runOnlyPendingTimers();
        expect(seen).toEqual([false, true, false]);
      } finally {
        dispose();
      }
    },
  );

  test('equipment image completions and selection render helper stay reactive', async () => {
    const props = {
      card: { Name: 'first' },
      disabled: false,
      imageLoader: { getSlimEquipCard: jest.fn(async name => ({ src: name })) },
    };
    const view = new EquipCardItem(props as any);
    const selected: boolean[] = [];
    const dispose = autorun(() => selected.push(view.getSelected()));
    try {
      await view.componentDidMount();
      expect(view.equipCardImage).toBe('first');
      view.onCardClick();
      expect(selected).toEqual([false, true]);
      (view as any).props = { ...props, card: { Name: 'second' } };
      await view.componentDidUpdate();
      expect(view.equipCardImage).toBe('second');
    } finally {
      dispose();
    }
  });

  test.each([PlayerCard, PlayerAvatar])(
    '%p image render helper tracks character changes and commits promise callbacks',
    async Component => {
      const player = observable({
        CharacterId: 1,
        Character: { Name: 'first' },
        Id: 'player',
        getHuaShenInfo: () => ({ characterId: 2 }),
      });
      (Sanguosha.getCharacterById as jest.Mock).mockReturnValue({ Name: 'side' });
      const imageLoader = { getCharacterSkinPlay: jest.fn(async name => ({ src: name, alt: name })) };
      const mainImage = { src: 'main.png', alt: 'main' };
      const sideImage = { src: 'side.png', alt: 'side' };
      const view = new (Component as any)({
        player,
        presenter: { ClientPlayer: player },
        skinData: [],
        imageLoader: { ...imageLoader, getCharacterImage: jest.fn(async () => sideImage) },
      });
      const dispose = autorun(() => view.renderCharacterImage());
      try {
        await Promise.resolve();
        expect(view.mainImage.src).toBe('first');
        expect(view.sideImage).toBe(sideImage);
        expect(isObservable(sideImage)).toBe(false);
        runInAction(() => {
          player.Character.Name = 'second';
        });
        await Promise.resolve();
        expect(view.mainImage.src).toBe('second');
        if (view.updateMainImage) {
          imageLoader.getCharacterSkinPlay.mockResolvedValueOnce(mainImage);
          await view.updateMainImage();
          expect(view.newMainImage).toBe(mainImage);
        }
      } finally {
        dispose();
      }
    },
  );

  test('curried skill callback mutates on invocation, and the render helper tracks selectedSkill', () => {
    const skill = {} as Skill;
    const store = observable({ selectedSkill: skill as Skill | undefined }, { selectedSkill: observable.ref });
    const onClickSkill = jest.fn();
    const view = new PlayerAvatar({ store, onClickSkill } as any) as any;
    const selected: boolean[] = [];
    const dispose = autorun(() => selected.push(view.getSkillSelected()));
    try {
      const click = view.onClickSkill(skill);
      expect(view.skillSelected).toBe(false);
      click();
      expect(onClickSkill).toHaveBeenCalledWith(skill, true);
      expect(selected).toEqual([false, true]);
      runInAction(() => {
        store.selectedSkill = undefined;
      });
      expect(view.skillSelected).toBe(false);
      expect(selected[selected.length - 1]).toBe(false);
    } finally {
      dispose();
    }
  });

  test('chat history, received messages and curried quick chat preserve shallow entries', () => {
    const broadcast = jest.fn();
    const chat = {
      chatHistory: () => [{ from: 'tester', timestamp: 0, message: 'history' }],
      received: jest.fn(),
      disconnect: jest.fn(),
    };
    const view = new MessageDialog({
      store: { room: { broadcast } },
      presenter: { ClientPlayer: { Id: 'self' } },
      connectionService: { Chat: chat },
    } as any) as any;
    const snapshots: unknown[] = [];
    const dispose = autorun(() =>
      snapshots.push([view.chatMessages.length, view.hideQuickChatItems, view.incomingMessage]),
    );
    try {
      view.componentDidMount();
      expect(view.chatMessages).toHaveLength(1);
      expect(isObservable(view.chatMessages[0])).toBe(false);
      chat.received.mock.calls[0][0]({ from: 'other', timestamp: 0, message: 'incoming' });
      expect(view.chatMessages).toHaveLength(2);
      expect(view.incomingMessage).toBe(true);
      const click = view.onClickQuickChatItem('hello');
      expect(broadcast).not.toHaveBeenCalled();
      click();
      expect(broadcast.mock.calls[0][1]).toEqual({ message: 'hello', playerId: 'self' });
      expect(view.hideQuickChatItems).toBe(false);
      view.componentWillUnmount();
      expect(chat.disconnect).toHaveBeenCalledTimes(1);
    } finally {
      dispose();
    }
  });

  test('curried drag callbacks update shallow styles and deep card positions only when invoked', () => {
    const card = { Id: 1 } as Card;
    const view = new GuanXingCardSlots({ cards: [card], bottom: 1, top: 1 } as any) as any;
    view.UNSAFE_componentWillMount();
    const snapshots: unknown[] = [];
    const dispose = autorun(() => snapshots.push([view.cardStyles[0], view.cardPositions[card.Id].top]));
    const event = (clientX: number, clientY: number) => ({ clientX, clientY });
    try {
      const down = view.onMouseDown(card, 0);
      expect(view.cardStyles[0]).toBeUndefined();
      down(event(10, 10));
      expect(view.cardStyles[0].zIndex).toBe(10);
      expect(isObservable(view.cardStyles[0])).toBe(false);
      view.onDrag(card, 0)(event(30, 170));
      expect(view.cardStyles[0]).toMatchObject({ top: 160, left: 20 });
      view.onMouseUp(card, 0)(event(30, 170));
      expect(view.cardPositions[card.Id].top).toBe(158);
      expect(view.cardStyles[0]).toEqual({ top: 0, left: 0 });
      view.onMouseDown(card, 0)(event(10, 10));
      view.onMouseLeave(card, 0)(event(10, 10));
      expect(view.cardStyles[0]).toEqual({ top: 0, left: 0 });
      expect(view.focusedCard).toBeUndefined();
    } finally {
      dispose();
    }
  });
});
