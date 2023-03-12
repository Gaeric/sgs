import { CardType } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { ActiveSkill, CommonSkill } from "../../skill";

@CommonSkill({ name: "huairou", description: "huairou_description" })
export class HuaiRou extends ActiveSkill {
  public canUse(room: Room, owner: Player): boolean {
    return owner.getPlayerCards().length > 0;
  }

  public numberOfTargets(): number {
    return 0;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return false;
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return Sanguosha.getCardById(cardId).is(CardType.Equip);
  }

  public async onUse(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId, cardIds } = event;
    if (!cardIds) {
      return false;
    }

    await room.reforge(cardIds[0], room.getPlayerById(fromId));

    return true;
  }
}
