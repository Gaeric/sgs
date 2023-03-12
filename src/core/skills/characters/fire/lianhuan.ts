import { VirtualCard } from "../../../cards/card";
import { TieSuoLianHuan } from "../../../cards/legion_fight/tiesuolianhuan";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId, CardSuit } from "../../../cards/libs/card_props";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import {
  CommonSkill,
  RulesBreakerSkill,
  ShadowSkill,
  ViewAsSkill,
} from "../../skill";

@CommonSkill({ name: "lianhuan", description: "lianhuan_description" })
export class LianHuan extends ViewAsSkill {
  public canViewAs(): string[] {
    return ["tiesuolianhuan"];
  }

  public canUse(room: Room, owner: Player) {
    return (
      owner.canUseCard(room, new CardMatcher({ name: ["tiesuolianhuan"] })) &&
      owner.getCardIds(PlayerCardsArea.HandArea).length > 0
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
    return Sanguosha.getCardById(pendingCardId).Suit === CardSuit.Club;
  }

  public availableCardAreas() {
    return [PlayerCardsArea.HandArea];
  }

  public viewAs(selectedCards: CardId[]) {
    return VirtualCard.create<TieSuoLianHuan>(
      {
        cardName: "tiesuolianhuan",
        bySkill: this.Name,
      },
      selectedCards
    );
  }
}

@ShadowSkill
@CommonSkill({ name: LianHuan.GeneralName, description: LianHuan.Description })
export class LianHuanShadow extends RulesBreakerSkill {
  public breakCardUsableTargets(
    cardId: CardId | CardMatcher,
    room: Room,
    owner: Player
  ): number {
    if (cardId instanceof CardMatcher) {
      return cardId.match(new CardMatcher({ name: ["tiesuolianhuan"] }))
        ? 1
        : 0;
    } else {
      return Sanguosha.getCardById(cardId).GeneralName === "tiesuolianhuan"
        ? 1
        : 0;
    }
  }
}
