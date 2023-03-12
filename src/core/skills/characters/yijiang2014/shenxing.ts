import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { ActiveSkill, CommonSkill } from "../../skill";

@CommonSkill({ name: "shenxing", description: "shenxing_description" })
export class ShenXing extends ActiveSkill {
  canUse() {
    return true;
  }

  numberOfTargets(): number {
    return 0;
  }

  cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === Math.min(2, owner.hasUsedSkillTimes(this.Name));
  }

  isAvailableTarget(): boolean {
    return false;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return room.canDropCard(owner, cardId);
  }

  public async onUse(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    if (
      room.getPlayerById(event.fromId).hasUsedSkillTimes(this.Name) > 1 &&
      event.cardIds
    ) {
      await room.dropCards(
        CardMoveReason.SelfDrop,
        event.cardIds,
        event.fromId,
        event.fromId,
        this.Name
      );
    }

    await room.drawCards(1, event.fromId, "top", event.fromId, this.Name);
    return true;
  }
}
