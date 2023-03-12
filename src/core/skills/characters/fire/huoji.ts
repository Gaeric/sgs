import { VirtualCard } from "../../../cards/card";
import { FireAttack } from "../../../cards/legion_fight/fire_attack";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CommonSkill, ViewAsSkill } from "../../skill";

@CommonSkill({ name: "huoji", description: "huoji_description" })
export class HuoJi extends ViewAsSkill {
  public get RelatedCharacters(): string[] {
    return ["pangtong"];
  }

  public canViewAs(): string[] {
    return ["fire_attack"];
  }

  public canUse(room: Room, owner: Player) {
    return (
      owner.canUseCard(room, new CardMatcher({ name: ["fire_attack"] })) &&
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
    return Sanguosha.getCardById(pendingCardId).isRed();
  }

  public viewAs(selectedCards: CardId[]) {
    return VirtualCard.create<FireAttack>(
      {
        cardName: "fire_attack",
        bySkill: this.Name,
      },
      selectedCards
    );
  }
}
