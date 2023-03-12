import { VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, RulesBreakerSkill } from "../../skill";

@CommonSkill({
  name: "fangtianhuaji",
  description: "fangtianhuaji_description",
})
export class FangTianHuaJiSkill extends RulesBreakerSkill {
  breakCardUsableTargets(
    cardId: CardId | CardMatcher,
    room: Room,
    owner: Player
  ): number {
    if (cardId instanceof CardMatcher) {
      return 0;
    }

    const handCards = owner.getCardIds(PlayerCardsArea.HandArea);
    if (handCards.length !== 1) {
      return 0;
    }

    const realCards = VirtualCard.getActualCards([cardId]);
    const isSlash =
      realCards.length === 1 ? realCards[0] === handCards[0] : false;
    if (isSlash && Sanguosha.getCardById(cardId).GeneralName === "slash") {
      return 2;
    }

    return 0;
  }
}
