import { WaitingRoomClientEventFinder, WaitingRoomEvent, WaitingRoomServerEventFinder } from 'core/event/event';
import { Sanguosha } from 'core/game/engine';
import { PlayerId } from 'core/player/player_props';
import { Logger } from 'core/shares/libs/logger/logger';
import { Flavor } from 'core/shares/types/host_config';
import { WaitingRoomInfo } from 'core/shares/types/waiting_room_info';
import { RoomService } from 'server/services/room_service';
import SocketIO from 'socket.io';

export class WaitingRoomSocket {
  private disposeCallback: () => void;
  private hangOutCallback: () => void;
  private connectedPlayersMap: Record<string, string> = {};
  private readonly defaultNumberOfPlayers = 8;
  private disposed = false;
  private activeGame = false;
  private gameHangoutNotified = false;
  private readonly socketHandlers = new Map<SocketIO.Socket, { event: string; handler: (...args: any[]) => void }[]>();

  constructor(
    private roomService: RoomService,
    private socket: SocketIO.Namespace,
    private flavor: Flavor,
    private logger: Logger,
    private waitingRoomInfo: WaitingRoomInfo,
  ) {
    this.socket.on('connection', this.onConnection);
  }

  private readonly onConnection = (socket: SocketIO.Socket) => {
    if (this.disposed) {
      return;
    }
    this.logger.info('user ' + socket.id + ' connected');
    const handlers = [
      { event: WaitingRoomEvent.RoomCreated, handler: this.onRoomCreated(socket) },
      { event: WaitingRoomEvent.GameInfoUpdate, handler: this.onGameInfoUpdate(socket) },
      { event: WaitingRoomEvent.GameStart, handler: this.onGameStart(socket) },
      { event: WaitingRoomEvent.PlayerChatMessage, handler: this.onSendMessage(socket) },
      { event: WaitingRoomEvent.PlayerEnter, handler: this.onPlayerEnter(socket) },
      { event: WaitingRoomEvent.PlayerLeave, handler: this.onPlayerLeave(socket) },
      { event: WaitingRoomEvent.PlayerReady, handler: this.onPlayerReady(socket) },
      { event: WaitingRoomEvent.SeatDisabled, handler: this.onSeatDisabled(socket) },
      { event: WaitingRoomEvent.ChangeHost, handler: this.onHostChanged(socket) },
      {
        event: 'disconnect',
        handler: () => {
          this.logger.info('user ' + socket.id + ' disconnected');
          const playerId = this.connectedPlayersMap[socket.id];
          if (playerId !== undefined) {
            this.removePlayer(playerId);
          }
          this.detachSocket(socket);
        },
      },
    ].map(({ event, handler }) => ({
      event,
      handler: (...args: any[]) => {
        if (!this.disposed) {
          (handler as (...args: any[]) => void)(...args);
        }
      },
    }));
    this.socketHandlers.set(socket, handlers);
    for (const { event, handler } of handlers) {
      socket.on(event, handler);
    }
  };

  private detachSocket(socket: SocketIO.Socket) {
    for (const { event, handler } of this.socketHandlers.get(socket) || []) {
      socket.removeListener(event, handler);
    }
    this.socketHandlers.delete(socket);
  }

  public dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.socket.removeListener('connection', this.onConnection);
    for (const socket of Array.from(this.socketHandlers.keys())) {
      this.detachSocket(socket);
    }
    this.connectedPlayersMap = {};
  }

  private removePlayer(playerId: PlayerId, byKicked = false) {
    const exists = this.waitingRoomInfo.players.some(player => player.playerId === playerId);
    // Explicit leave/kick consumes the socket mapping too, so its subsequent
    // disconnect cannot broadcast or release the room a second time.
    for (const [socketId, mappedPlayer] of Object.entries(this.connectedPlayersMap)) {
      if (mappedPlayer === playerId) {
        delete this.connectedPlayersMap[socketId];
      }
    }
    if (!exists) {
      return;
    }
    this.waitingRoomInfo.players = this.waitingRoomInfo.players.filter(player => player.playerId !== playerId);
    let newHostPlayerId: PlayerId | undefined;
    // GameStart navigates everyone out of this namespace. Retain its host and
    // backing room while the game is active, rather than treating it as a quit.
    if (!this.activeGame && playerId === this.waitingRoomInfo.hostPlayerId) {
      newHostPlayerId = this.waitingRoomInfo.players[0]?.playerId;
      if (newHostPlayerId !== undefined) {
        this.setHost(newHostPlayerId);
      }
    }
    this.broadcast(WaitingRoomEvent.PlayerLeave, { leftPlayerId: playerId, byKicked, newHostPlayerId });
    this.handleEmptyRoom();
  }

  private handleEmptyRoom() {
    if (this.disposed || this.waitingRoomInfo.players.length > 0) {
      return;
    }
    if (this.activeGame) {
      if (!this.gameHangoutNotified) {
        this.gameHangoutNotified = true;
        this.hangOutCallback?.();
      }
    } else {
      this.dispose();
      this.disposeCallback?.();
    }
  }

  public markGameStarted() {
    this.activeGame = true;
    this.gameHangoutNotified = false;
    this.waitingRoomInfo.isPlaying = true;
  }

  public finishGame() {
    if (this.disposed) {
      return;
    }
    this.activeGame = false;
    this.waitingRoomInfo.isPlaying = false;
    if (
      this.waitingRoomInfo.players.length > 0 &&
      !this.waitingRoomInfo.players.some(player => player.playerId === this.waitingRoomInfo.hostPlayerId)
    ) {
      this.reassigHost(this.waitingRoomInfo.hostPlayerId, this.waitingRoomInfo.players[0].playerId);
    }
    this.handleEmptyRoom();
  }

  private setHost(playerId: PlayerId) {
    this.waitingRoomInfo.hostPlayerId = playerId;
    this.waitingRoomInfo.roomInfo.hostPlayerId = playerId;
  }

  private broadcast<Event extends WaitingRoomEvent>(e: Event, content: WaitingRoomServerEventFinder<Event>) {
    this.socket.emit(e, content);
  }

  private getAvailabeSeatId() {
    for (let i = 0; i < this.defaultNumberOfPlayers; i++) {
      if (!this.waitingRoomInfo.closedSeats.includes(i) && !this.waitingRoomInfo.players.find(p => p.seatId === i)) {
        return i;
      }
    }

    return -1;
  }

  private readonly onGameInfoUpdate =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.GameInfoUpdate>) => {
      for (const key of Object.keys(evt.roomInfo)) {
        this.waitingRoomInfo.roomInfo[key] = evt.roomInfo[key];
      }

      this.broadcast(WaitingRoomEvent.GameInfoUpdate, evt);
    };

  private readonly onGameStart =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.GameStart>) => {
      if (this.waitingRoomInfo.isPlaying || this.connectedPlayersMap[socket.id] !== this.waitingRoomInfo.hostPlayerId) {
        return;
      }
      const { roomId, gameInfo } = this.roomService.createRoom(
        {
          ...evt.roomInfo,
          campaignMode: !!evt.roomInfo.campaignMode,
          flavor: this.flavor,
        },
        this.waitingRoomInfo.roomInfo,
        this.waitingRoomInfo.roomId,
      );

      // RoomService marks the actual game lifetime; keep the same boundary for
      // alternate service implementations without resetting an existing owner.
      if (!this.activeGame) {
        this.markGameStarted();
      }
      this.broadcast(WaitingRoomEvent.GameStart, {
        roomId,
        otherPlayersId: this.waitingRoomInfo.players.map(player => player.playerId),
        roomInfo: gameInfo,
      });
    };

  private readonly onSendMessage =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.PlayerChatMessage>) => {
      this.broadcast(WaitingRoomEvent.PlayerChatMessage, { ...evt, timestamp: Date.now() });
    };

  private readonly onPlayerEnter =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.PlayerEnter>) => {
      const playerId = evt.playerInfo.playerId;
      const mappedPlayer = this.connectedPlayersMap[socket.id];
      // A repeated packet on the same live connection is a no-op. A different
      // connection must not take over another player's seat or eject that owner.
      if (mappedPlayer === playerId) {
        return;
      }
      const seatId = this.getAvailabeSeatId();
      if (
        mappedPlayer !== undefined ||
        this.waitingRoomInfo.players.some(player => player.playerId === playerId) ||
        seatId < 0 ||
        this.waitingRoomInfo.players.length >= this.waitingRoomInfo.roomInfo.numberOfPlayers ||
        evt.coreVersion !== Sanguosha.Version
      ) {
        socket.emit(WaitingRoomEvent.PlayerLeave, { leftPlayerId: playerId, byKicked: false });
        return;
      }
      this.waitingRoomInfo.isPlaying = false;
      this.connectedPlayersMap[socket.id] = playerId;
      const playerInfo = { ...evt.playerInfo, seatId, playerReady: false };
      this.waitingRoomInfo.players.push(playerInfo);
      this.broadcast(WaitingRoomEvent.PlayerEnter, {
        hostPlayerId: this.waitingRoomInfo.hostPlayerId,
        playerInfo,
        otherPlayersInfo: this.waitingRoomInfo.players.filter(player => player.playerId !== playerId),
        roomInfo: this.waitingRoomInfo.roomInfo,
        disableSeats: this.waitingRoomInfo.closedSeats,
      });
    };

  private readonly onPlayerLeave =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.PlayerLeave>) => {
      if (this.connectedPlayersMap[socket.id] === evt.leftPlayerId) {
        this.removePlayer(evt.leftPlayerId);
      }
    };

  private readonly onPlayerReady =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.PlayerReady>) => {
      const player = this.waitingRoomInfo.players.find(p => p.playerId === evt.readyPlayerId);
      if (player) {
        player.playerReady = evt.isReady;
      }

      this.broadcast(WaitingRoomEvent.PlayerReady, evt);
    };

  private readonly onSeatDisabled =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.SeatDisabled>) => {
      if (evt.disabled) {
        this.waitingRoomInfo.closedSeats.push(evt.seatId);
        this.waitingRoomInfo.roomInfo.numberOfPlayers--;
      } else {
        this.waitingRoomInfo.closedSeats = this.waitingRoomInfo.closedSeats.filter(s => s !== evt.seatId);
        this.waitingRoomInfo.roomInfo.numberOfPlayers++;
      }

      if (evt.kickedPlayerId) {
        this.removePlayer(evt.kickedPlayerId, true);
      }

      this.broadcast(WaitingRoomEvent.SeatDisabled, evt);
    };

  private readonly onHostChanged =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.ChangeHost>) => {
      if (
        this.connectedPlayersMap[socket.id] === this.waitingRoomInfo.hostPlayerId &&
        evt.prevHostPlayerId === this.waitingRoomInfo.hostPlayerId
      ) {
        this.reassigHost(evt.prevHostPlayerId, evt.newHostPlayerId);
      }
    };

  private readonly onRoomCreated =
    (socket: SocketIO.Socket) => (evt: WaitingRoomClientEventFinder<WaitingRoomEvent.RoomCreated>) => {
      if (evt.roomInfo.coreVersion !== Sanguosha.Version) {
        this.broadcast(WaitingRoomEvent.RoomCreated, { error: 'unmatched core version' });
      } else {
        this.broadcast(WaitingRoomEvent.RoomCreated, {
          error: null,
          ...evt,
          roomId: this.waitingRoomInfo.roomId,
          disabledSeats: this.waitingRoomInfo.closedSeats,
        });
      }
    };

  public readonly onClosed = (disposeCallback: () => void) => {
    this.disposeCallback = disposeCallback;
  };

  public readonly onGameStarting = (hangOutCallback: () => void) => {
    this.hangOutCallback = hangOutCallback;
  };

  public readonly reassigHost = (prevHostPlayerId: PlayerId, newHostPlayerId: PlayerId) => {
    if (
      this.disposed ||
      !this.waitingRoomInfo.players.some(player => player.playerId === newHostPlayerId) ||
      this.waitingRoomInfo.hostPlayerId === newHostPlayerId
    ) {
      return;
    }
    this.setHost(newHostPlayerId);
    this.broadcast(WaitingRoomEvent.ChangeHost, { prevHostPlayerId, newHostPlayerId });
  };
}
