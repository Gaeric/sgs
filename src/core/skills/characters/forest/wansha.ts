import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { GlobalFilterSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "wansha", description: "wansha_description" })
export class WanSha extends GlobalFilterSkill {
  public get RelatedCharacters(): string[] {
    return ["god_simayi"];
  }

  public audioIndex(characterName?: string) {
    return characterName && this.RelatedCharacters.includes(characterName)
      ? 1
      : 2;
  }

  canUseCardTo(
    cardId: CardId | CardMatcher,
    room: Room,
    owner: Player,
    from: Player,
    to: Player
  ) {
    const inOwnersRound =
      room.CurrentPlayer.Id === owner.Id && to.Dying && from.Id !== to.Id;

    if (cardId instanceof CardMatcher) {
      if (inOwnersRound && cardId.match(new CardMatcher({ name: ["peach"] }))) {
        return false;
      }
    } else {
      if (
        inOwnersRound &&
        Sanguosha.getCardById(cardId).GeneralName === "peach"
      ) {
        return false;
      }
    }

    return true;
  }
}
