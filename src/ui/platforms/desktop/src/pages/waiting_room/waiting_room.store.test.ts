import type { WaitingRoomGameSettings } from 'core/game/game_props';
import {
  autorun,
  isObservable,
  isObservableArray,
  isObservableProp,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import { WaitingRoomStore } from './waiting_room.store';
import type { WaitingRoomSeatInfo } from './waiting_room.store';

// WaitingRoom binds its store with observable.ref. Exercise that same legacy
// decorator contract without importing the page (and its socket/browser UI).
class WaitingRoomBinding {
  @observable.ref
  store = new WaitingRoomStore('self');

  constructor() {
    makeObservable(this);
  }
}

describe('WaitingRoomStore observability', () => {
  test('makeObservable initializes decorated fields on each independent store', () => {
    const store = new WaitingRoomStore('self');
    const other = new WaitingRoomStore('other');

    expect(store.selfPlayerId).toBe('self');
    expect(isObservableProp(store, 'selfPlayerId')).toBe(false);
    for (const field of ['gameSettings', 'seats', 'chatMessages']) {
      expect(isObservableProp(store, field)).toBe(true);
    }
    expect(store.gameSettings).toEqual({});
    expect(store.seats).toEqual([]);
    expect(store.chatMessages).toEqual([]);
    expect(store.gameSettings).not.toBe(other.gameSettings);
    expect(store.seats).not.toBe(other.seats);
    expect(store.chatMessages).not.toBe(other.chatMessages);
  });

  test('deep settings observe replacement, nested assignment and array mutation', () => {
    const store = new WaitingRoomStore('self');
    const settings = { numberOfPlayers: 8, excludedCharacters: [] } as unknown as WaitingRoomGameSettings;
    const updates: string[] = [];
    const dispose = autorun(() => {
      updates.push(`${store.gameSettings.numberOfPlayers}:${store.gameSettings.excludedCharacters?.join(',')}`);
    });

    try {
      runInAction(() => {
        store.gameSettings = settings;
      });
      expect(store.gameSettings).not.toBe(settings);
      expect(isObservable(store.gameSettings)).toBe(true);
      expect(isObservableArray(store.gameSettings.excludedCharacters)).toBe(true);
      runInAction(() => {
        store.gameSettings.numberOfPlayers = 4;
      });
      runInAction(() => {
        store.gameSettings.excludedCharacters.push(1);
      });
      expect(updates).toEqual(['undefined:undefined', '8:', '4:', '4:1']);
    } finally {
      dispose();
    }
  });

  test('shallow seats observe array changes but preserve plain seat references', () => {
    const store = new WaitingRoomStore('self');
    const seat: WaitingRoomSeatInfo = { seatId: 0, seatDisabled: false, playerName: 'Alice' };
    const updates: string[] = [];
    const dispose = autorun(() => {
      updates.push(store.seats.map(item => (item.seatDisabled ? 'disabled' : item.playerName)).join(','));
    });

    try {
      runInAction(() => {
        store.seats.push(seat);
      });
      expect(isObservableArray(store.seats)).toBe(true);
      expect(store.seats[0]).toBe(seat);
      expect(isObservable(seat)).toBe(false);
      seat.playerName = 'Bob';
      expect(updates).toEqual(['', 'Alice']);
      runInAction(() => {
        store.seats[0] = { seatId: 0, seatDisabled: true };
      });
      runInAction(() => {
        store.seats = [];
      });
      expect(updates).toEqual(['', 'Alice', 'disabled', '']);
    } finally {
      dispose();
    }
  });

  test('shallow chat messages observe replacement and insertion, not message internals', () => {
    const store = new WaitingRoomStore('self');
    const message = { message: 'hello', from: 'self', timestamp: 1 };
    const messages = [message];
    const updates: string[] = [];
    const dispose = autorun(() => updates.push(store.chatMessages.map(item => item.message).join(',')));

    try {
      runInAction(() => {
        store.chatMessages = messages;
      });
      expect(isObservableArray(store.chatMessages)).toBe(true);
      expect(store.chatMessages).not.toBe(messages);
      expect(store.chatMessages[0]).toBe(message);
      expect(isObservable(message)).toBe(false);
      message.message = 'edited';
      expect(updates).toEqual(['', 'hello']);
      runInAction(() => {
        store.chatMessages.push({ message: 'next', from: 'other', timestamp: 2 });
      });
      expect(updates).toEqual(['', 'hello', 'edited,next']);
    } finally {
      dispose();
    }
  });

  test('ref bindings retain the store instance and react only to reference replacement', () => {
    const binding = new WaitingRoomBinding();
    const original = binding.store;
    const updates: WaitingRoomStore[] = [];
    const dispose = autorun(() => updates.push(binding.store));

    try {
      expect(isObservableProp(binding, 'store')).toBe(true);
      expect(binding.store).toBe(original);
      runInAction(() => {
        binding.store.seats.push({ seatId: 0, seatDisabled: false });
      });
      expect(updates).toEqual([original]);
      const replacement = new WaitingRoomStore('other');
      runInAction(() => {
        binding.store = replacement;
      });
      expect(binding.store).toBe(replacement);
      expect(updates).toEqual([original, replacement]);
      // MobX suppresses a redundant assignment to the same reference.
      runInAction(() => {
        binding.store = replacement;
      });
      expect(updates).toHaveLength(2);
    } finally {
      dispose();
    }
  });
});
