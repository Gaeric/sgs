import { CardType, VirtualCard } from "../../../cards/card";
import { Alcohol } from "../../../cards/legion_fight/alcohol";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { RulesBreakerSkill, ViewAsSkill } from "../../skill";
import { CommonSkill, ShadowSkill } from "../../skill_wrappers";

@CommonSkill({ name: "qishe", description: "qishe_description" })
export class QiShe extends ViewAsSkill {
  public canViewAs(): string[] {
    return ["alcohol"];
  }

  public canUse(room: Room, owner: Player) {
    return (
      owner.canUseCard(room, new CardMatcher({ name: ["alcohol"] })) &&
      owner.getPlayerCards().length > 0
    );
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableCard(
    room: Room,
    owner: Player,
    pendingCardId: CardId
  ): boolean {
    return Sanguosha.getCardById(pendingCardId).is(CardType.Equip);
  }

  public viewAs(selectedCards: CardId[]) {
    return VirtualCard.create<Alcohol>(
      {
        cardName: "alcohol",
        bySkill: this.Name,
      },
      selectedCards
    );
  }
}

@ShadowSkill
@CommonSkill({ name: QiShe.Name, description: QiShe.Description })
export class QiSheShadow extends RulesBreakerSkill {
  public breakAdditionalCardHoldNumber(room: Room, owner: Player): number {
    return owner.getCardIds(PlayerCardsArea.EquipArea).length;
  }
}
