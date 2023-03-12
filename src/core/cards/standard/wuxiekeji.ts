import { CardSuit } from "../libs/card_props";
import type { RealCardId } from "../libs/card_props";
import { TrickCard } from "../trick_card";
import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { WuXieKeJiSkill } from "../../skills";
import { None } from "../card";

@None
export class WuXieKeJi extends TrickCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      0,
      "wuxiekeji",
      "wuxiekeji_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName("wuxiekeji")
    );
  }

  get Skill() {
    return this.skill as WuXieKeJiSkill;
  }
}
