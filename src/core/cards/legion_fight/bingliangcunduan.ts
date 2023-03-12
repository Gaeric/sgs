import { CardSuit } from "../libs/card_props";
import type { RealCardId } from "../libs/card_props";
import { DelayedTrick, TrickCard } from "../trick_card";
import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { BingLiangCunDuanSkill } from "../../skills";

@DelayedTrick
export class BingLiangCunDuan extends TrickCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      1,
      "bingliangcunduan",
      "bingliangcunduan_description",
      GameCardExtensions.LegionFight,
      SkillLoader.getInstance().getSkillByName("bingliangcunduan")
    );
  }

  get Skill() {
    return this.skill as BingLiangCunDuanSkill;
  }
}
