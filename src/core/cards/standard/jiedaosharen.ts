import { CardSuit } from "../libs/card_props";
import type { RealCardId } from "../libs/card_props";
import { TrickCard } from "../trick_card";
import { GameCardExtensions, INFINITE_DISTANCE } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { JieDaoShaRenSkill } from "../../skills";
import { Single } from "../card";

@Single
export class JieDaoShaRen extends TrickCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      INFINITE_DISTANCE,
      "jiedaosharen",
      "jiedaosharen_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName("jiedaosharen")
    );
  }

  get Skill() {
    return this.skill as JieDaoShaRenSkill;
  }
}
