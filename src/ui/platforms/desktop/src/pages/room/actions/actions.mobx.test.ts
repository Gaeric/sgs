import { Card } from 'core/cards/card';
import { PlayerCardsArea } from 'core/player/player_props';
import { Skill } from 'core/skills/skill';
import { ClientTranslationModule } from 'core/translations/translation_module.client';
import { action, autorun, runInAction } from 'mobx';
import { BaseAction } from './base_action';
import { SelectAction } from './select_action';
import { RoomPresenter } from '../room.presenter';
import { RoomStore } from '../room.store';

jest.mock('core/game/engine', () => ({ Sanguosha: { getCardById: () => ({ Name: 'card' }) } }));
jest.mock('core/cards/card', () => ({ Card: class {}, CardType: {}, VirtualCard: {} }));
jest.mock('core/cards/libs/card_matcher', () => ({ CardMatcher: class {} }));
jest.mock('core/skills/skill', () => ({
  Skill: class {},
  ActiveSkill: class {},
  GlobalFilterSkill: class {},
  ResponsiveSkill: class {},
  TriggerSkill: class {},
  ViewAsSkill: class {},
}));

class TestAction extends BaseAction {
  public chooseSkill(skill: Skill) {
    this.selectSkill(skill);
  }

  public clearSkill(skill: Skill) {
    this.unselectSkill(skill);
  }

  public async onPlay() {
    return undefined;
  }
}

function fixture() {
  const store = new RoomStore();
  const player = { getCardIds: () => [] };
  runInAction(() => {
    store.room = { getPlayerById: () => player, getAlivePlayersFrom: () => [] } as any;
  });
  // Keep observable writes in the real actions under test. Presenter stand-ins
  // record callbacks without accidentally giving them an outer action context.
  const methods: Record<string, jest.Mock> = {};
  const presenter = new Proxy(methods, {
    get(target, key: string) {
      return (target[key] ||= jest.fn());
    },
  });
  presenter.resetSelectedSkill.mockImplementation(
    action(() => {
      store.selectedSkill = undefined;
    }),
  );
  const args = ['self', store, presenter as unknown as RoomPresenter, {} as ClientTranslationModule] as const;
  return { store, presenter, args };
}

describe('room action MobX boundaries', () => {
  test('skill selection and reset are safe outside a presenter action, including after await', async () => {
    const { store, args } = fixture();
    const current = new TestAction(...args);
    const skill = {} as Skill;
    const states: string[] = [];
    const dispose = autorun(() => states.push(`${store.selectedSkill === skill}:${store.selectedCards.join(',')}`));
    try {
      await Promise.resolve();
      current.chooseSkill(skill);
      expect(store.selectedSkill).toBe(skill);
      current.clearSkill(skill);
      expect(store.selectedSkill).toBeUndefined();
      runInAction(() => store.selectedCards.push(1));
      await Promise.resolve();
      current.resetAction();
      expect(store.selectedCards).toEqual([]);
      expect(states).toEqual(['false:', 'true:', 'false:', 'false:1', 'false:']);
    } finally {
      dispose();
    }
  });

  test('deferred card callback can splice observed selection without a caller action', async () => {
    const { store, presenter, args } = fixture();
    const current = new SelectAction(...args, {} as any);
    const selected = current.onSelectCard([PlayerCardsArea.HandArea], 1);
    const callback = presenter.onClickPlayerCard.mock.calls[1][0] as (card: Card, selected: boolean) => void;
    const dispose = autorun(() => store.selectedCards.slice());
    try {
      runInAction(() => store.selectedCards.push(1));
      await Promise.resolve();
      callback({ Id: 1 } as Card, false);
      expect(store.selectedCards).toEqual([]);
      presenter.defineConfirmButtonActions.mock.calls[0][0]();
      await expect(selected).resolves.toEqual([]);
    } finally {
      dispose();
    }
  });
});
