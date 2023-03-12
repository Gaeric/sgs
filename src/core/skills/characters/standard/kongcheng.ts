import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { Sanguosha } from "../../../game/engine";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CompulsorySkill, FilterSkill } from "../../skill";

@CompulsorySkill({ name: "kongcheng", description: "kongcheng_description" })
export class KongCheng extends FilterSkill {
  public canBeUsedCard(
    cardId: CardId | CardMatcher,
    room: Room,
    owner: PlayerId,
    attacker?: PlayerId
  ): boolean {
    const player = room.getPlayerById(owner);

    if (player.getCardIds(PlayerCardsArea.HandArea).length !== 0) {
      return true;
    }

    if (cardId instanceof CardMatcher) {
      return !new CardMatcher({ generalName: ["slash", "duel"] }).match(cardId);
    } else {
      const cardName = Sanguosha.getCardById(cardId).GeneralName;
      return cardName !== "slash" && cardName !== "duel";
    }
  }
}
