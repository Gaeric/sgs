import { CardType, VirtualCard } from 'core/cards/card';
import { GameEventIdentifiers, ServerEventFinder } from 'core/event/event';
import { Sanguosha } from 'core/game/engine';
import { SkillType } from 'core/skills/skill';
import { SelectAction } from './actions/select_action';
import { GameClientProcessor } from './game_processor';

// Keep the real processor/event packer, but do not load the engine's card/skill
// registry, actions, or dialog dependency trees for these lifecycle tests.
jest.mock('core/game/engine', () => ({
  Sanguosha: { Version: 'test-version', getCardById: jest.fn(), getSkillBySkillName: jest.fn() },
}));
jest.mock('core/cards/card', () => ({
  Card: jest.fn(),
  CardType: { Equip: 'equip' },
  VirtualCard: { getActualCards: jest.fn() },
}));
jest.mock('core/cards/libs/card_matcher', () => ({ CardMatcher: jest.fn() }));
jest.mock('core/characters/character', () => ({ CharacterGender: { Male: 0 } }));
jest.mock('core/skills/skill', () => ({ SkillType: { Limit: 3, Awaken: 2 } }));
jest.mock('core/shares/libs/system', () => ({ System: {} }));
jest.mock('./actions/ask_for_peach_action', () => ({ AskForPeachAction: jest.fn() }));
jest.mock('./actions/card_response_action', () => ({ CardResponseAction: jest.fn() }));
jest.mock('./actions/play_phase_action', () => ({ PlayPhaseAction: jest.fn() }));
jest.mock('./actions/responsive_card_use_action', () => ({ ResponsiveUseCardAction: jest.fn() }));
jest.mock('./actions/select_action', () => ({ SelectAction: jest.fn() }));
jest.mock('./actions/skill_use_action', () => ({ SkillUseAction: jest.fn() }));
jest.mock('./ui/dialog/card_display_dialog/card_display_dialog', () => ({ CardDisplayDialog: () => null }));
jest.mock('./ui/dialog/card_selector_dialog/card_selector_dialog', () => ({ CardSelectorDialog: () => null }));
jest.mock('./ui/dialog/character_selector_dialog/character_selector_dialog', () => ({
  CharacterSelectorDialog: () => null,
}));
jest.mock('./ui/dialog/game_over_dialog/game_over_dialog', () => ({ GameOverDialog: () => null }));
jest.mock('./ui/dialog/guanxing_dialog/guanxing_dialog', () => ({ GuanXingDialog: () => null }));
jest.mock('./ui/dialog/wugufengdeng_dialog/wugufengdeng_dialog', () => ({ WuGuFengDengDialog: () => null }));
jest.mock('./ui/switch_avatar/switch_skin', () => ({ getSkinName: () => ({ skinName: 'default' }) }));

type ProcessorArgs = ConstructorParameters<typeof GameClientProcessor>;

class TestProcessor extends GameClientProcessor {
  public get isDisposed() {
    return this.disposed;
  }

  public recordResponse(content = {}) {
    this.record(
      GameEventIdentifiers.AskForChoosingPlayerEvent,
      content as ServerEventFinder<GameEventIdentifiers.AskForChoosingPlayerEvent>,
    );
  }

  public backToWaitingRoom(content: ServerEventFinder<GameEventIdentifiers.BackToWaitingRoomEvent>) {
    this.BackingToWaitingRoomEvent(GameEventIdentifiers.BackToWaitingRoomEvent, content);
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fixture() {
  const player = {
    Id: 'viewer',
    Name: 'Viewer',
    Position: 0,
    Gender: 0,
    Character: { Name: 'test-character' },
    AI: { onAction: jest.fn(() => ({ fromId: 'viewer' })) },
    isTrusted: jest.fn(() => false),
    setMark: jest.fn(),
  };
  const room = {
    Analytics: { record: jest.fn() },
    CurrentPlayerPhase: 0,
    isPlaying: jest.fn(() => false),
    RoomId: 7,
    Info: {},
    Players: [player],
    getPlayerById: jest.fn(() => player),
    broadcast: jest.fn(),
    useCard: jest.fn(),
    useSkill: jest.fn(),
    obtainSkill: jest.fn(),
  };
  const store = {
    room,
    clientPlayerId: 'viewer',
    clientRoomInfo: { playerName: 'Viewer' },
    inAction: false,
    notificationTime: 1,
    awaitingResponseEvent: { identifier: GameEventIdentifiers.AskForChoosingPlayerEvent, event: { toId: 'viewer' } },
  };
  const presenter = {
    ClientPlayer: player,
    clearNotifiers: jest.fn(),
    startAction: jest.fn(),
    endAction: jest.fn(),
    closeDialog: jest.fn(),
    closeIncomingConversation: jest.fn(),
    disableActionButton: jest.fn(),
    enableActionButton: jest.fn(),
    createIncomingConversation: jest.fn(),
    broadcastUIUpdate: jest.fn(),
    showCards: jest.fn(),
    playCardAnimation: jest.fn(),
    onceSkillUsed: jest.fn(),
    switchSkillStateChanged: jest.fn(),
    defineConfirmButtonActions: jest.fn(),
    defineCancelButtonActions: jest.fn(),
  };
  const electron = { sendReplayEventFlow: jest.fn() };
  const audio = { playCardAudio: jest.fn(), playEquipAudio: jest.fn(), playSkillAudio: jest.fn() };
  const waitingRoom = jest.fn();
  const processor = new TestProcessor(
    presenter as unknown as ProcessorArgs[0],
    store as unknown as ProcessorArgs[1],
    {} as ProcessorArgs[2],
    {} as ProcessorArgs[3],
    audio as unknown as ProcessorArgs[4],
    electron as unknown as ProcessorArgs[5],
    undefined,
    waitingRoom,
  );
  return { processor, presenter, store, room, player, electron, waitingRoom };
}

function dispatch(processor: GameClientProcessor, identifier: GameEventIdentifiers, content: object = {}) {
  return processor.onHandleIncomingEvent(identifier, content as ServerEventFinder<GameEventIdentifiers>);
}

describe('GameClientProcessor cleanup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('dispose is terminal/idempotent, cancels its timer, and does not mutate the presenter', () => {
    const { processor, presenter, room, player } = fixture();
    processor.recordResponse();
    expect(jest.getTimerCount()).toBe(1);
    jest.clearAllMocks();
    processor.dispose();
    processor.dispose();
    expect(processor.isDisposed).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
    processor.onPlayTrustedAction();
    processor.endAction();
    processor.recordResponse();
    jest.runOnlyPendingTimers();
    expect(player.AI.onAction).not.toHaveBeenCalled();
    expect(room.broadcast).not.toHaveBeenCalled();
    expect(presenter.closeDialog).not.toHaveBeenCalled();
    expect(presenter.closeIncomingConversation).not.toHaveBeenCalled();
    expect(presenter.disableActionButton).not.toHaveBeenCalled();
    expect(presenter.endAction).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('active record still starts actions, honors ignored notification status, and saves replay flow', () => {
    const { processor, presenter, store, room, electron, player } = fixture();
    room.isPlaying.mockReturnValue(true);
    store.inAction = true;
    processor.recordResponse();
    processor.recordResponse({ ignoreNotifiedStatus: true });
    expect(presenter.endAction).toHaveBeenCalledTimes(1);
    expect(presenter.startAction).toHaveBeenCalledTimes(2);
    expect(electron.sendReplayEventFlow).toHaveBeenCalledTimes(2);
    expect(electron.sendReplayEventFlow.mock.calls[0][1]).toMatchObject({
      version: 'test-version',
      roomId: 7,
      viewerId: 'viewer',
      viewerName: 'Viewer',
      playersInfo: [{ Id: 'viewer', Name: 'Viewer', Position: 0 }],
    });
    // Even when record does not end the previous action there is only one timer.
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(999);
    expect(room.broadcast).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(player.AI.onAction).toHaveBeenCalledTimes(1);
    expect(room.broadcast).toHaveBeenCalledTimes(1);
    expect(presenter.endAction).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
    processor.dispose();
  });

  test('disposed dispatch skips readiness checks, analytics, recording and handlers', async () => {
    const { processor, presenter, room, electron, player } = fixture();
    processor.dispose();
    await dispatch(processor, GameEventIdentifiers.SetMarkEvent, { to: 'viewer', name: 'mark', value: 1 });
    await dispatch(processor, GameEventIdentifiers.AskForChoosingPlayerEvent);
    expect(room.Analytics.record).not.toHaveBeenCalled();
    expect(presenter.clearNotifiers).not.toHaveBeenCalled();
    expect(presenter.startAction).not.toHaveBeenCalled();
    expect(electron.sendReplayEventFlow).not.toHaveBeenCalled();
    expect(player.setMark).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each([
    [GameEventIdentifiers.AskForPinDianCardEvent, 'onSelectCard'],
    [GameEventIdentifiers.AskForCardDropEvent, 'onSelectCard'],
    [GameEventIdentifiers.AskForCardDisplayEvent, 'onSelectCard'],
    [GameEventIdentifiers.AskForCardEvent, 'onSelectCard'],
    [GameEventIdentifiers.AskForChoosingPlayerEvent, 'onSelectPlayer'],
    [GameEventIdentifiers.AskForChoosingCardAvailableTargetEvent, 'onSelectCardTargets'],
  ] as const)('selection %s completing after disposal cannot respond or close UI', async (identifier, method) => {
    const { processor, presenter, room } = fixture();
    const selection = deferred<string[]>();
    (SelectAction as unknown as jest.Mock).mockImplementation(() => ({ [method]: () => selection.promise }));
    const completion = dispatch(processor, identifier, { toId: 'viewer', cardAmount: 1, conversation: 'choose' });
    expect(presenter.createIncomingConversation).toHaveBeenCalledTimes(1);
    processor.dispose();
    selection.resolve(['selected']);
    await completion;
    expect(room.broadcast).not.toHaveBeenCalled();
    expect(presenter.closeIncomingConversation).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each([
    [GameEventIdentifiers.CardUseEvent, 'useCard'],
    [GameEventIdentifiers.SkillUseEvent, 'useSkill'],
    [GameEventIdentifiers.ObtainSkillEvent, 'obtainSkill'],
  ] as const)('event %s completing after disposal cannot update UI or animate', async (identifier, method) => {
    const { processor, presenter, room } = fixture();
    const event = deferred<void>();
    room[method].mockReturnValue(event.promise);
    (Sanguosha.getCardById as jest.Mock).mockReturnValue({
      Name: 'card',
      is: (type: CardType) => type === CardType.Equip,
    });
    (Sanguosha.getSkillBySkillName as jest.Mock).mockReturnValue({ SkillType: SkillType.Limit });
    const completion = dispatch(processor, identifier, {
      fromId: 'viewer',
      toId: 'viewer',
      cardId: 'card',
      skillName: 'skill',
      mute: true,
    });
    expect(room[method]).toHaveBeenCalledTimes(1);
    processor.dispose();
    event.resolve();
    await completion;
    expect(VirtualCard.getActualCards).not.toHaveBeenCalled();
    expect(presenter.showCards).not.toHaveBeenCalled();
    expect(presenter.playCardAnimation).not.toHaveBeenCalled();
    expect(presenter.onceSkillUsed).not.toHaveBeenCalled();
    expect(presenter.switchSkillStateChanged).not.toHaveBeenCalled();
    expect(presenter.broadcastUIUpdate).not.toHaveBeenCalled();
  });

  test('active selection still responds and real asynchronous errors remain observable', async () => {
    const { processor, presenter, room } = fixture();
    (SelectAction as unknown as jest.Mock).mockImplementation(() => ({ onSelectPlayer: async () => ['target'] }));
    await dispatch(processor, GameEventIdentifiers.AskForChoosingPlayerEvent, { toId: 'viewer' });
    expect(room.broadcast).toHaveBeenCalledWith(GameEventIdentifiers.AskForChoosingPlayerEvent, {
      fromId: 'viewer',
      selectedPlayers: ['target'],
    });
    expect(presenter.closeIncomingConversation).toHaveBeenCalledTimes(1);
    const event = deferred<void>();
    room.obtainSkill.mockReturnValue(event.promise);
    const completion = dispatch(processor, GameEventIdentifiers.ObtainSkillEvent, {
      toId: 'viewer',
      skillName: 'skill',
    });
    processor.dispose();
    const error = new Error('obtain failed');
    event.reject(error);
    await expect(completion).rejects.toBe(error);
  });

  test('retained response callbacks and waiting room creation are inert after disposal', async () => {
    const { processor, presenter, room, waitingRoom } = fixture();
    await dispatch(processor, GameEventIdentifiers.AskForFortuneCardExchangeEvent);
    const confirm = presenter.defineConfirmButtonActions.mock.calls[0][0] as () => void;
    const cancel = presenter.defineCancelButtonActions.mock.calls[0][0] as () => void;
    processor.dispose();
    confirm();
    cancel();
    const content = { roomId: 8, roomInfo: {} } as ServerEventFinder<GameEventIdentifiers.BackToWaitingRoomEvent>;
    processor.backToWaitingRoom(content);
    await dispatch(processor, GameEventIdentifiers.BackToWaitingRoomEvent, content);
    expect(room.broadcast).not.toHaveBeenCalled();
    expect(presenter.closeIncomingConversation).not.toHaveBeenCalled();
    expect(waitingRoom).not.toHaveBeenCalled();
  });
});
