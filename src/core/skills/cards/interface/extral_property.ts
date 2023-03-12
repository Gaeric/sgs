import { CardId } from "../../../cards/libs/card_props";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";

export interface ExtralCardSkillProperty {
  isCardAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId,
    selectedCards: CardId[],
    selectedTargets: PlayerId[],
    containerCard?: CardId
  ): boolean;
}
