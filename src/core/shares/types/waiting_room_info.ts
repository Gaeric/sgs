import {
  WaitingRoomEvent,
  WaitingRoomServerEventFinder,
} from "../../event/event";
import { TemporaryRoomCreationInfo } from "../../game/game_props";
import { PlayerId } from "../../player/player_props";
import { RoomId } from "../../room/room";

export type WaitingRoomInfo = {
  roomId: RoomId;
  roomInfo: TemporaryRoomCreationInfo;
  players: WaitingRoomServerEventFinder<WaitingRoomEvent.PlayerEnter>["otherPlayersInfo"];
  closedSeats: number[];
  hostPlayerId: PlayerId;
  isPlaying: boolean;
};
