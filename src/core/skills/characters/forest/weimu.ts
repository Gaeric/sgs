import { CardType } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId, CardSuit } from "../../../cards/libs/card_props";
import { Sanguosha } from "../../../game/engine";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CompulsorySkill, FilterSkill } from "../../skill";

@CompulsorySkill({ name: "weimu", description: "weimu_description" })
export class WeiMu extends FilterSkill {
  public get RelatedCharacters(): string[] {
    return ["wangyuanji"];
  }

  public audioIndex(characterName?: string): number {
    return characterName && this.RelatedCharacters.includes(characterName)
      ? 1
      : 2;
  }

  public canBeUsedCard(
    cardId: CardId | CardMatcher,
    room: Room,
    owner: PlayerId,
    attacker?: PlayerId
  ): boolean {
    if (cardId instanceof CardMatcher) {
      return !new CardMatcher({
        suit: [CardSuit.Spade, CardSuit.Club],
        type: [CardType.Trick],
      }).match(cardId);
    } else {
      const card = Sanguosha.getCardById(cardId);
      return !(card.is(CardType.Trick) && card.isBlack());
    }
  }
}
