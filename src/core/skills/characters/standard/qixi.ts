import { VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { Slash } from "../../../cards/standard/slash";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CommonSkill, ViewAsSkill } from "../../skill";

@CommonSkill({ name: "qixi", description: "qixi_description" })
export class QiXi extends ViewAsSkill {
  public get RelatedCharacters(): string[] {
    return ["heqi"];
  }

  public audioIndex(characterName?: string): number {
    return characterName && this.RelatedCharacters.includes(characterName)
      ? 1
      : 2;
  }

  public canViewAs(): string[] {
    return ["guohechaiqiao"];
  }
  public canUse(room: Room, owner: Player) {
    return owner.canUseCard(room, new CardMatcher({ name: this.canViewAs() }));
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }
  public isAvailableCard(
    room: Room,
    owner: Player,
    pendingCardId: CardId,
    selectedCards: CardId[],
    containerCard?: CardId | undefined
  ): boolean {
    return Sanguosha.getCardById(pendingCardId).isBlack();
  }

  public viewAs(selectedCards: CardId[]) {
    return VirtualCard.create<Slash>(
      {
        cardName: "guohechaiqiao",
        bySkill: this.Name,
      },
      selectedCards
    );
  }
}
