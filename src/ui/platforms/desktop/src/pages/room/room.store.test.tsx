import { Card } from 'core/cards/card';
import { GameEventIdentifiers } from 'core/event/event';
import type { ServerEventFinder } from 'core/event/event';
import type { ClientSocket } from 'core/network/socket.client';
import { ClientPlayer } from 'core/player/player.client';
import { ClientRoom } from 'core/room/room.client';
import { Skill } from 'core/skills/skill';
import type { ClientTranslationModule } from 'core/translations/translation_module.client';
import type { ImageLoader } from 'image_loader/image_loader';
import { autorun, isAction, isObservable, isObservableArray, isObservableProp, runInAction } from 'mobx';
import * as React from 'react';
import { RoomPresenter } from './room.presenter';
import { RoomStore } from './room.store';
import type { ClientRoomInfo, DisplayCardProp } from './room.store';
import type { ConversationProps } from './ui/conversation/conversation';

// Keep the real domain prototypes, store and presenter, without loading the
// engine's entire card/character/skill registry or rendering dialog components.
jest.mock('core/game/engine', () => ({ Sanguosha: { Version: 'test-version' } }));
jest.mock('./ui/dialog/card_category_dialog/card_category_dialog', () => ({ CardCategoryDialog: () => null }));
jest.mock('./ui/conversation/conversation', () => ({ Conversation: () => null }));

function playerFixture(id = 'self'): ClientPlayer {
  return Object.assign(Object.create(ClientPlayer.prototype) as ClientPlayer, {
    playerId: id,
    playerName: id,
    playerPosition: 0,
  });
}

function cardFixture(id = 1): Card {
  return Object.assign(Object.create(Card.prototype) as Card, { id });
}

function displayedCardFixture(id = 1): DisplayCardProp {
  return { card: cardFixture(id), from: undefined, to: undefined };
}

function roomFixture(players = [playerFixture()]): ClientRoom {
  return Object.assign(Object.create(ClientRoom.prototype) as ClientRoom, { players });
}

function presenterFixture() {
  const presenter = new RoomPresenter({} as ImageLoader);
  const store = presenter.createStore();
  return { presenter, store };
}

describe('RoomStore MobX 6 observability', () => {
  test('initializes decorated fields and independent mutable defaults for each instance', () => {
    const store = new RoomStore();
    const other = new RoomStore();
    expect(isObservable(store)).toBe(true);
    // Include uninitialized refs explicitly: enumerating the instance alone can
    // miss a field whose decorator was accidentally removed.
    for (const field of [
      'room',
      'clientRoomInfo',
      'clientPlayerId',
      'selectorDialog',
      'selectorViewDialog',
      'incomingConversation',
      'selectedSkill',
      'inAction',
      'clientPlayerCardActionsMatcher',
      'onClickHandCardToPlay',
      'confirmButtonAction',
      'cancelButtonAction',
      'finishButtonAction',
      'updateUIFlag',
      'canReforge',
      'notificationTime',
    ] as const) {
      expect(isObservableProp(store, field)).toBe(true);
      expect(isObservableProp(other, field)).toBe(true);
    }
    for (const field of [
      'gameLog',
      'messageLog',
      'displayedCards',
      'displayedCardsAnimationStyles',
      'animationPosition',
      'actionButtonStatus',
      'awaitingResponseEvent',
      'notifiedPlayers',
      'selectedCards',
      'selectedPlayers',
      'incomingUserMessages',
      'onceSkillUsedHistory',
      'switchSkillState',
    ] as const) {
      expect(store[field]).not.toBe(other[field]);
    }
    expect(store.actionButtonStatus).toEqual({ confirm: false, cancel: false, finish: false });
    expect(store.awaitingResponseEvent).toEqual({});
    expect(store.notificationTime).toBe(60);
    expect(store.currentCircle).toBe(0);
    expect(store.updateUIFlag).toBe(false);
    expect(store.isSkillDisabled({} as Skill)).toBe(false);
    runInAction(() => {
      store.selectedCards.push(1);
      store.actionButtonStatus.confirm = true;
    });
    expect(other.selectedCards).toEqual([]);
    expect(other.actionButtonStatus.confirm).toBe(false);
  });

  test('ref fields retain plain objects, JSX and function identities without making them observable', () => {
    const { presenter, store } = presenterFixture();
    const info: ClientRoomInfo = {
      roomId: 1,
      playerName: 'self',
      playerId: 'self',
      socket: {} as ClientSocket,
      timestamp: 1,
    };
    const dialog = <span>choose</span>;
    const matcher = jest.fn(() => true);
    const click = jest.fn();
    const snapshots: unknown[][] = [];
    const dispose = autorun(() =>
      snapshots.push([
        store.clientRoomInfo,
        store.selectorDialog,
        store.selectorViewDialog,
        store.incomingConversation,
        store.clientPlayerCardActionsMatcher,
        store.onClickHandCardToPlay,
      ]),
    );
    try {
      presenter.setupRoomStatus(info);
      presenter.createDialog(dialog);
      presenter.createViewDialog(dialog);
      runInAction(() => {
        store.incomingConversation = dialog;
      });
      presenter.setupClientPlayerCardActionsMatcher(matcher);
      presenter.onClickPlayerCard(click);
      const values = [info, dialog, dialog, dialog, matcher, click];
      snapshots[snapshots.length - 1].forEach((value, index) => {
        expect(value).toBe(values[index]);
        expect(isObservable(value)).toBe(false);
      });
      expect(isAction(store.clientPlayerCardActionsMatcher)).toBe(false);
      expect(isAction(store.onClickHandCardToPlay)).toBe(false);
      info.playerName = 'renamed';
      expect(snapshots).toHaveLength(7);
      presenter.setupRoomStatus(info);
      expect(snapshots).toHaveLength(7);
      presenter.setupRoomStatus({ ...info });
      expect(snapshots).toHaveLength(8);
      expect(store.clientRoomInfo).not.toBe(info);
    } finally {
      dispose();
    }
  });

  test('domain instances and ref state objects remain nonobservable and retain their identities', () => {
    const store = new RoomStore();
    const room = roomFixture();
    const skill = Object.assign(Object.create(Skill.prototype) as Skill, { skillName: 'test' });
    const status = { confirm: true, cancel: false, finish: false };
    const messages = { self: 'hello' };
    const event = { identifier: GameEventIdentifiers.AskForChoosingPlayerEvent };
    runInAction(() => {
      store.room = room;
      store.selectedSkill = skill;
      store.actionButtonStatus = status;
      store.incomingUserMessages = messages;
      store.awaitingResponseEvent = event;
    });
    expect(store.room).toBe(room);
    expect(store.selectedSkill).toBe(skill);
    expect(store.actionButtonStatus).toBe(status);
    expect(store.incomingUserMessages).toBe(messages);
    expect(store.awaitingResponseEvent).toBe(event);
    for (const value of [
      room,
      room.Players,
      room.Players[0],
      skill,
      store.animationPosition,
      status,
      messages,
      event,
    ]) {
      expect(isObservable(value)).toBe(false);
    }
    const updates: boolean[] = [];
    const dispose = autorun(() => updates.push(store.actionButtonStatus.confirm));
    try {
      status.confirm = false;
      expect(updates).toEqual([true]);
      runInAction(() => {
        store.actionButtonStatus = { ...status };
      });
      expect(updates).toEqual([true, false]);
    } finally {
      dispose();
    }
  });

  test.each(['gameLog', 'messageLog'] as const)(
    '%s is a shallow array preserving JSX on insertion and replacement',
    field => {
      const store = new RoomStore();
      const element = <span>log</span>;
      const source = [element];
      const updates: number[] = [];
      const dispose = autorun(() => updates.push(store[field].length));
      try {
        runInAction(() => {
          store[field] = source;
        });
        expect(isObservableArray(store[field])).toBe(true);
        expect(store[field]).not.toBe(source);
        expect(store[field][0]).toBe(element);
        expect(isObservable(element)).toBe(false);
        runInAction(() => {
          store[field].push('next');
        });
        runInAction(() => {
          store[field].splice(0, 1);
        });
        expect(store[field]).toEqual(['next']);
        expect(updates).toEqual([0, 1, 2, 1]);
      } finally {
        dispose();
      }
    },
  );

  test('displayed cards and selected players react to membership, not nested item mutations', () => {
    const { presenter, store } = presenterFixture();
    const card = displayedCardFixture();
    const player = playerFixture();
    const cards: (boolean | undefined)[][] = [];
    const positions: number[][] = [];
    const disposeCards = autorun(() => cards.push(store.displayedCards.map(item => item.buried)));
    const disposePlayers = autorun(() => positions.push(store.selectedPlayers.map(item => item.Position)));
    try {
      presenter.showCards(card);
      presenter.selectPlayer(player);
      expect(isObservableArray(store.displayedCards)).toBe(true);
      expect(isObservableArray(store.selectedPlayers)).toBe(true);
      expect(store.displayedCards[0]).toBe(card);
      expect(store.selectedPlayers[0]).toBe(player);
      expect(isObservable(card)).toBe(false);
      expect(isObservable(card.card)).toBe(false);
      expect(isObservable(player)).toBe(false);
      presenter.buryCards(card.card.Id);
      player.Position = 3;
      expect(cards).toEqual([[], [undefined]]);
      expect(positions).toEqual([[], [0]]);
      expect(card.buried).toBe(true);
      runInAction(() => {
        store.displayedCards = [card];
        store.selectedPlayers = [player];
      });
      expect(cards).toEqual([[], [undefined], [true]]);
      expect(positions).toEqual([[], [0], [3]]);
      expect(store.displayedCards[0]).toBe(card);
      expect(store.selectedPlayers[0]).toBe(player);
      presenter.unselectPlayer(player);
      expect(positions).toEqual([[], [0], [3], []]);
    } finally {
      disposeCards();
      disposePlayers();
    }
  });

  test('selected card and notified player arrays observe presenter insertion, removal and replacement', () => {
    const { presenter, store } = presenterFixture();
    const updates: string[] = [];
    const dispose = autorun(() =>
      updates.push(`${store.selectedCards.join(',')}/${store.notifiedPlayers.join(',')}:${store.notificationTime}`),
    );
    try {
      expect(isObservableArray(store.selectedCards)).toBe(true);
      expect(isObservableArray(store.notifiedPlayers)).toBe(true);
      presenter.selectCard(cardFixture());
      presenter.notify(['self'], 10);
      presenter.unselectCard(cardFixture());
      presenter.clearNotifiers();
      presenter.clearSelectedCards();
      expect(updates).toEqual(['/:60', '1/:60', '1/self:10', '/self:10', '/:10', '/:10']);
    } finally {
      dispose();
    }
  });

  test('animation style map observes keys and replacements but does not enhance style values', () => {
    const store = new RoomStore();
    const style: React.CSSProperties = { opacity: 1 };
    const source = { 1: style };
    const updates: (number | string | undefined)[] = [];
    const dispose = autorun(() => updates.push(store.displayedCardsAnimationStyles[1]?.opacity));
    try {
      runInAction(() => {
        store.displayedCardsAnimationStyles = source;
      });
      expect(isObservable(store.displayedCardsAnimationStyles)).toBe(true);
      expect(store.displayedCardsAnimationStyles).not.toBe(source);
      expect(store.displayedCardsAnimationStyles[1]).toBe(style);
      expect(isObservable(style)).toBe(false);
      style.opacity = 0;
      expect(updates).toEqual([undefined, 1]);
      runInAction(() => {
        store.displayedCardsAnimationStyles[1] = { opacity: 0.5 };
      });
      runInAction(() => {
        delete store.displayedCardsAnimationStyles[1];
      });
      expect(updates).toEqual([undefined, 1, 0.5, undefined]);
    } finally {
      dispose();
    }
  });

  test('broadcastUIUpdate invalidates a view of nested mutations in a ref room', () => {
    const { presenter, store } = presenterFixture();
    // A plain fixture also catches accidentally changing room from ref to deep.
    const room = { Players: [{ Name: 'before' }] } as unknown as ClientRoom;
    runInAction(() => {
      store.room = room;
    });
    const updates: string[] = [];
    const dispose = autorun(() => {
      // Room views explicitly subscribe to this invalidation flag.
      const flag = store.updateUIFlag;
      updates.push(`${flag}:${store.room.Players[0].Name}`);
    });
    try {
      expect(store.room).toBe(room);
      expect(isObservable(room)).toBe(false);
      Object.assign(room.Players[0], { Name: 'after' });
      expect(updates).toEqual(['false:before']);
      presenter.broadcastUIUpdate();
      presenter.broadcastUIUpdate();
      expect(updates).toEqual(['false:before', 'true:after', 'false:after']);
    } finally {
      dispose();
    }
  });
});

describe('RoomPresenter actions with observed fields', () => {
  test('computed ClientPlayer tracks room and player-id replacements without enhancing engine instances', () => {
    const { presenter, store } = presenterFixture();
    const player = playerFixture();
    const other = playerFixture('other');
    const room = roomFixture([player, other]);
    const updates: (ClientPlayer | undefined)[] = [];
    const dispose = autorun(() => updates.push(presenter.ClientPlayer));
    try {
      presenter.setupClientPlayerId('self');
      runInAction(() => {
        store.room = room;
      });
      presenter.setupClientPlayerId('other');
      expect(updates).toEqual([undefined, player, other]);
      expect(presenter.ClientPlayer).toBe(other);
      expect(isObservable(other)).toBe(false);
    } finally {
      dispose();
    }
  });

  test('dialog, log and response actions update observed state without relaxing enforcement', () => {
    const { presenter, store } = presenterFixture();
    const dialog = <span>choose</span>;
    const event = { toId: 'self' } as ServerEventFinder<GameEventIdentifiers>;
    const updates: unknown[][] = [];
    const dispose = autorun(() =>
      updates.push([
        store.selectorDialog,
        store.selectorViewDialog,
        store.gameLog.slice(),
        store.messageLog.slice(),
        store.inAction,
        store.awaitingResponseEvent.identifier,
        store.canReforge,
      ]),
    );
    try {
      presenter.createDialog(dialog);
      presenter.createViewDialog(dialog);
      presenter.addGameLog(dialog);
      presenter.addUserMessage('hello');
      presenter.startAction(GameEventIdentifiers.AskForChoosingPlayerEvent, event);
      expect(store.awaitingResponseEvent.event).toBe(event);
      expect(isObservable(event)).toBe(false);
      presenter.enableCardReforgeStatus();
      presenter.disableCardReforgeStatus();
      presenter.closeDialog();
      presenter.closeViewDialog();
      presenter.endAction();
      expect(updates).toHaveLength(11);
      expect(updates[updates.length - 1]).toEqual([undefined, undefined, [dialog], ['hello'], false, undefined, false]);
      expect(store.awaitingResponseEvent).toEqual({});
    } finally {
      dispose();
    }
  });

  test.each(['confirm', 'cancel', 'finish'] as const)(
    '%s callback resets itself and executes its handler inside an action',
    button => {
      const { presenter, store } = presenterFixture();
      const updates: boolean[] = [];
      const callbacks: unknown[] = [];
      const key = `${button}ButtonAction` as 'confirmButtonAction' | 'cancelButtonAction' | 'finishButtonAction';
      const dispose = autorun(() => updates.push(store.canReforge));
      const disposeCallback = autorun(() => callbacks.push(store[key]));
      const handler = jest.fn(() => {
        expect(store[key]).toBeUndefined();
        expect(store.actionButtonStatus.confirm).toBe(false);
        expect(store.actionButtonStatus.cancel).toBe(false);
        // This observed write must inherit the callback's action context.
        store.canReforge = true;
      });
      try {
        presenter.enableActionButton('confirm', 'cancel');
        if (button === 'confirm') {
          presenter.defineConfirmButtonActions(handler);
        } else if (button === 'cancel') {
          presenter.defineCancelButtonActions(handler);
        } else {
          presenter.defineFinishButtonActions(handler);
          expect(store.actionButtonStatus.finish).toBe(true);
        }
        const callback = store[key]!;
        expect(isAction(callback)).toBe(true);
        callback();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(store.actionButtonStatus[button]).toBe(false);
        expect(updates).toEqual([false, true]);
        expect(callbacks).toEqual([undefined, callback, undefined]);
      } finally {
        dispose();
        disposeCallback();
      }
    },
  );

  test('conversation option callback closes the observed conversation before invoking the original handler', () => {
    const { presenter, store } = presenterFixture();
    const original = jest.fn(() => expect(store.incomingConversation).toBeUndefined());
    const props: ConversationProps = {
      translator: {} as ClientTranslationModule,
      conversation: 'choose',
      optionsActionHanlder: { accept: original },
    };
    const updates: (React.ReactElement | undefined)[] = [];
    const dispose = autorun(() => updates.push(store.incomingConversation));
    try {
      presenter.createIncomingConversation(props);
      const conversation = store.incomingConversation!;
      expect(isObservable(conversation)).toBe(false);
      const callback = (conversation.props as ConversationProps).optionsActionHanlder!.accept;
      expect(callback).not.toBe(original);
      callback();
      expect(original).toHaveBeenCalledTimes(1);
      expect(updates).toEqual([undefined, conversation, undefined]);
    } finally {
      dispose();
    }
  });

  test('showCards timer removes old cards and resets shallow styles with observers active', () => {
    jest.useFakeTimers();
    const { presenter, store } = presenterFixture();
    const initial = Array.from({ length: 8 }, (_, index) => displayedCardFixture(index + 1));
    const next = displayedCardFixture(9);
    const updates: number[][] = [];
    const styles: string[][] = [];
    const dispose = autorun(() => updates.push(store.displayedCards.map(item => item.card.Id as number)));
    const disposeStyles = autorun(() =>
      styles.push(
        Object.keys(store.displayedCardsAnimationStyles).map(key =>
          JSON.stringify(store.displayedCardsAnimationStyles[key]),
        ),
      ),
    );
    try {
      presenter.showCards(...initial);
      presenter.showCards(next);
      expect(store.displayedCardsAnimationStyles[1].opacity).toBe(0);
      expect(isObservable(store.displayedCardsAnimationStyles[1])).toBe(false);
      jest.advanceTimersByTime(599);
      expect(store.displayedCards).toHaveLength(9);
      jest.advanceTimersByTime(1);
      expect(store.displayedCards).toEqual([initial[7], next]);
      expect(store.displayedCards[0]).toBe(initial[7]);
      expect(store.displayedCardsAnimationStyles[1]).toEqual({});
      expect(updates).toEqual([[], [1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6, 7, 8, 9], [8, 9]]);
      expect(styles).toHaveLength(3);
    } finally {
      dispose();
      disposeStyles();
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  test('playCardAnimation timer deletes observed styles and broadcasts completion', () => {
    jest.useFakeTimers();
    const { presenter, store } = presenterFixture();
    const card = displayedCardFixture();
    const element = document.createElement('div');
    element.id = card.card.Id.toString();
    document.body.appendChild(element);
    const styles: (React.CSSProperties | undefined)[] = [];
    const updates: (boolean | undefined)[] = [];
    const disposeStyles = autorun(() => styles.push(store.displayedCardsAnimationStyles[card.card.Id]));
    const dispose = autorun(() => {
      const flag = store.updateUIFlag;
      updates.push(flag && card.animationPlayed);
    });
    try {
      presenter.playCardAnimation(card, { x: 100, y: 50 });
      const style = store.displayedCardsAnimationStyles[card.card.Id];
      expect(style).toEqual({ transition: 'unset', opacity: 0, transform: 'translate(100px, 50px)' });
      expect(isObservable(style)).toBe(false);
      jest.advanceTimersByTime(99);
      expect(card.animationPlayed).toBeUndefined();
      jest.advanceTimersByTime(1);
      expect(card.animationPlayed).toBe(true);
      expect(styles).toEqual([undefined, style, undefined]);
      expect(updates).toEqual([false, true]);
      presenter.playCardAnimation(card, { x: 100, y: 50 });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      dispose();
      disposeStyles();
      element.remove();
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
