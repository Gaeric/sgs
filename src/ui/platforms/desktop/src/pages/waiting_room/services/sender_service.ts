import { WaitingRoomClientEventFinder, WaitingRoomEvent, WaitingRoomServerEventFinder } from 'core/event/event';
import { Sanguosha } from 'core/game/engine';
import { WaitingRoomGameSettings } from 'core/game/game_props';
import { PlayerId } from 'core/player/player_props';
import { ChatPacketObject } from 'services/connection_service/connection_service';
export class WaitingRoomSender {
  constructor(private socket: SocketIOClient.Socket) {}

  private disposed = false;
  private readonly chatHandlers = new Map<
    (msg: ChatPacketObject) => void,
    (evt: WaitingRoomServerEventFinder<WaitingRoomEvent.PlayerChatMessage>) => void
  >();

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const handler of this.chatHandlers.values()) {
      this.socket.off(WaitingRoomEvent.PlayerChatMessage, handler);
    }
    this.chatHandlers.clear();
  }

  broadcast<I extends WaitingRoomEvent>(identifier: I, event: WaitingRoomClientEventFinder<I>) {
    if (this.disposed) {
      return;
    }
    this.socket.emit(identifier, event);
  }

  saveSettings(settings: WaitingRoomGameSettings) {
    if (this.disposed) {
      return;
    }
    this.socket.emit(WaitingRoomEvent.GameInfoUpdate, { roomInfo: settings });
  }

  sendChat(from: string, message: string) {
    if (this.disposed) {
      return;
    }
    this.socket.emit(WaitingRoomEvent.PlayerChatMessage, {
      from,
      messageContent: message,
    });
  }

  giveHostTo(from: PlayerId, to: PlayerId) {
    if (this.disposed) {
      return;
    }
    this.socket.emit(WaitingRoomEvent.ChangeHost, { prevHostPlayerId: from, newHostPlayerId: to });
  }

  onReceivingChatMessage(receiver: (msg: ChatPacketObject) => void) {
    if (this.disposed || this.chatHandlers.has(receiver)) {
      return;
    }
    const handler = (evt: WaitingRoomServerEventFinder<WaitingRoomEvent.PlayerChatMessage>) => {
      if (this.disposed) {
        return;
      }
      receiver({
        from: evt.from,
        message: evt.messageContent,
        timestamp: evt.timestamp,
      });
    };
    this.chatHandlers.set(receiver, handler);
    this.socket.on(WaitingRoomEvent.PlayerChatMessage, handler);
  }

  enterRoom(playerId: PlayerId, avatarId: number, playerName: string, isHost: boolean) {
    if (this.disposed) {
      return;
    }
    this.socket.emit(WaitingRoomEvent.PlayerEnter, {
      playerInfo: { playerId, avatarId, playerName },
      isHost,
      coreVersion: Sanguosha.Version,
    });
  }

  leaveRoom(playerId: PlayerId) {
    if (this.disposed) {
      return;
    }
    this.socket.emit(WaitingRoomEvent.PlayerLeave, {
      leftPlayerId: playerId,
    });
  }

  getReady(playerId: PlayerId, ready: boolean) {
    if (this.disposed) {
      return;
    }
    this.socket.emit(WaitingRoomEvent.PlayerReady, {
      readyPlayerId: playerId,
      isReady: ready,
    });
  }

  requestGameStart(roomInfo: WaitingRoomClientEventFinder<WaitingRoomEvent.GameStart>['roomInfo']) {
    if (this.disposed) {
      return;
    }
    this.socket.emit(WaitingRoomEvent.GameStart, { roomInfo });
  }

  kickPlayerOrCloseSeat(seatId: number, close: boolean, kickedPlayerId?: PlayerId) {
    const closeSeatEvent: WaitingRoomClientEventFinder<WaitingRoomEvent.SeatDisabled> = {
      seatId,
      disabled: close,
      kickedPlayerId,
    };

    if (this.disposed) {
      return;
    }
    this.socket.emit(WaitingRoomEvent.SeatDisabled, closeSeatEvent);
  }
}
