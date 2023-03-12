import { VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { WuXieKeJi } from "../../../cards/standard/wuxiekeji";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CommonSkill, ViewAsSkill } from "../../skill";

@CommonSkill({ name: "kanpo", description: "kanpo_description" })
export class KanPo extends ViewAsSkill {
  public get RelatedCharacters(): string[] {
    return ["pangtong"];
  }

  public canViewAs(): string[] {
    return ["wuxiekeji"];
  }

  public canUse(room: Room, owner: Player): boolean {
    return (
      owner.canUseCard(room, new CardMatcher({ name: ["wuxiekeji"] })) &&
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
    return Sanguosha.getCardById(pendingCardId).isBlack();
  }

  public viewAs(selectedCards: CardId[]) {
    return VirtualCard.create<WuXieKeJi>(
      {
        cardName: "wuxiekeji",
        bySkill: this.Name,
      },
      selectedCards
    );
  }
}
