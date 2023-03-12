import { CardSuit } from "../libs/card_props";
import type { RealCardId } from "../libs/card_props";
import { TrickCard } from "../trick_card";
import { GameCardExtensions, INFINITE_DISTANCE } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { GuoHeChaiQiaoSkill } from "../../skills/cards/standard/guohechaiqiao";

export class GuoHeChaiQiao extends TrickCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      INFINITE_DISTANCE,
      "guohechaiqiao",
      "guohechaiqiao_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName("guohechaiqiao")
    );
  }

  get Skill() {
    return this.skill as GuoHeChaiQiaoSkill;
  }
}
