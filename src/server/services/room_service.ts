import { WorkPlace } from 'core/event/event';
import { GameProcessor } from 'core/game/game_processor/game_processor';
import { GameInfo, TemporaryRoomCreationInfo } from 'core/game/game_props';
import { GameCommonRules } from 'core/game/game_rules';
import { RecordAnalytics } from 'core/game/record_analytics';
import { ServerSocket } from 'core/network/socket.server';
import { Player } from 'core/player/player';
import { RoomId } from 'core/room/room';
import { ServerRoom } from 'core/room/room.server';
import { RoomEventStacker } from 'core/room/utils/room_event_stack';
import { System } from 'core/shares/libs/system';
import { Flavor } from 'core/shares/types/host_config';
import { GameMode } from 'core/shares/types/room_props';
import { RoomInfo } from 'core/shares/types/server_types';
import { WaitingRoomInfo } from 'core/shares/types/waiting_room_info';
import { WaitingRoomSocket } from 'server/channels/waiting_room';
import SocketIO from 'socket.io';

export class RoomService {
  private rooms: ServerRoom[] = [];
  private waitingRooms: WaitingRoomInfo[] = [];
  private hostPlayerIps: Map<string, number> = new Map();
  private waitingRoomMaps: Map<number | string, WaitingRoomSocket> = new Map();
  private readonly waitingRoomGames = new WeakMap<WaitingRoomInfo, Set<ServerRoom>>();

  constructor(
    private readonly lobbySocket: SocketIO.Server,
    private createGameServerSocket: (roomChannel: SocketIO.Namespace, roomId: RoomId) => ServerSocket,
    private createServerRoom: (
      roomId: RoomId,
      gameInfo: GameInfo,
      socket: ServerSocket,
      gameProcessor: GameProcessor,
      analytics: RecordAnalytics,
      players: Player[],
      flavor: Flavor,
      gameMode: GameMode,
      gameCommonRules: GameCommonRules,
      eventStack: RoomEventStacker<WorkPlace.Server>,
      waitingRoomInfo: { roomInfo: TemporaryRoomCreationInfo; roomId: number },
    ) => ServerRoom,
    private createRecordAnalytics: () => RecordAnalytics,
    private createGameCommonRules: () => GameCommonRules,
    private createRoomEventStacker: () => RoomEventStacker<WorkPlace.Server>,
    private createGameWaitingRoom: (info: TemporaryRoomCreationInfo, roomId: RoomId) => WaitingRoomInfo,
    private createWaitingRoomSocket: (socket: SocketIO.Namespace, roomInfo: WaitingRoomInfo) => WaitingRoomSocket,
    private createDifferentModeGameProcessor: (gameMode: GameMode) => GameProcessor,
  ) {}

  checkRoomExist(roomId: RoomId) {
    return (
      this.rooms.find(room => room.RoomId === roomId) !== undefined ||
      this.waitingRooms.find(room => room.roomId === roomId && !room.isPlaying) !== undefined
    );
  }

  getRoomsInfo(): readonly RoomInfo[] {
    return [
      ...this.rooms.map(room => room.getRoomInfo()),
      ...this.waitingRooms.filter(room => !room.isPlaying).map(room => this.getWaitingRoomInfo(room)),
    ];
  }

  private getWaitingRoomInfo(room: WaitingRoomInfo): RoomInfo {
    const { roomInfo, players, roomId } = room;
    return {
      name: roomInfo.roomName,
      activePlayers: players.length,
      totalPlayers: roomInfo.numberOfPlayers,
      status: 'waiting',
      packages: roomInfo.characterExtensions,
      id: roomId,
      gameMode: roomInfo.gameMode,
      passcode: roomInfo.passcode,
      allowObserver: !!roomInfo.allowObserver,
    };
  }

  createRoom(
    gameInfo: GameInfo,
    roomInfo: TemporaryRoomCreationInfo & { roomId?: number },
    waitingRoomId: number,
  ): { roomId: RoomId; gameInfo: GameInfo } {
    const waitingRoom = this.waitingRooms.find(room => room.roomId === waitingRoomId);
    const waitingRoomSocket = this.waitingRoomMaps.get(waitingRoomId);
    const roomId = roomInfo.roomId || Date.now();
    const roomSocket = this.createGameServerSocket(this.lobbySocket.of(`/room-${roomId}`), roomId);
    const room = this.createServerRoom(
      roomId,
      gameInfo,
      roomSocket,
      this.createDifferentModeGameProcessor(gameInfo.gameMode),
      this.createRecordAnalytics(),
      [],
      gameInfo.flavor,
      gameInfo.gameMode,
      this.createGameCommonRules(),
      this.createRoomEventStacker(),
      { roomInfo, roomId: waitingRoomId },
    );

    if (waitingRoom && waitingRoomSocket) {
      const games = this.waitingRoomGames.get(waitingRoom) || new Set<ServerRoom>();
      games.add(room);
      this.waitingRoomGames.set(waitingRoom, games);
      waitingRoomSocket.markGameStarted();
    }
    let closing = false;
    room.onClosed(async () => {
      if (closing) {
        return;
      }
      closing = true;
      this.rooms = this.rooms.filter(r => r !== room);

      // Keep the existing grace period for game clients to return. Capture the
      // exact backing room/channel and game owner: the numeric ID may be reused,
      // or returned players may already have started another game during it.
      await System.MainThread.sleep(1500);
      const games = waitingRoom && this.waitingRoomGames.get(waitingRoom);
      games?.delete(room);
      if (
        waitingRoom &&
        waitingRoomSocket &&
        this.waitingRooms.includes(waitingRoom) &&
        this.waitingRoomMaps.get(waitingRoomId) === waitingRoomSocket &&
        games?.size === 0
      ) {
        this.waitingRoomGames.delete(waitingRoom);
        waitingRoomSocket.finishGame();
      }
    });

    this.rooms.push(room);

    return {
      roomId,
      gameInfo: {
        ...gameInfo,
        campaignMode: !!gameInfo.campaignMode,
      },
    };
  }

  createWaitingRoom(roomInfo: TemporaryRoomCreationInfo & { roomId?: number }, hostIp: string) {
    const room = this.createGameWaitingRoom(roomInfo, roomInfo.roomId || Date.now());
    const roomSocket = this.createWaitingRoomSocket(this.lobbySocket.of(`/waiting-room-${room.roomId}`), room);
    this.waitingRoomMaps.set(room.roomId, roomSocket);

    let quotaReleased = false;
    const releaseQuota = () => {
      if (quotaReleased) {
        return;
      }
      quotaReleased = true;
      const createdRooms = this.hostPlayerIps.get(hostIp) || 0;
      if (createdRooms > 0) {
        this.hostPlayerIps.set(hostIp, createdRooms - 1);
      }
    };
    roomSocket.onClosed(() => {
      roomSocket.dispose();
      this.waitingRooms = this.waitingRooms.filter(r => r !== room);
      if (this.waitingRoomMaps.get(room.roomId) === roomSocket) {
        this.waitingRoomMaps.delete(room.roomId);
      }
      releaseQuota();
    });
    roomSocket.onGameStarting(releaseQuota);

    this.waitingRooms.push(room);
    const createdRooms = this.hostPlayerIps.get(hostIp) || 0;
    this.hostPlayerIps.set(hostIp, createdRooms + 1);

    return {
      roomId: room.roomId,
      roomInfo,
    };
  }

  isValidToCreateWaitingRoom(playerIp: string): boolean {
    return this.hostPlayerIps.get(playerIp) === undefined || this.hostPlayerIps.get(playerIp)! < 2;
  }
}
