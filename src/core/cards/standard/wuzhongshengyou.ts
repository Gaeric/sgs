import { CardSuit } from "../libs/card_props";
import type { RealCardId } from "../libs/card_props";
import { TrickCard } from "../trick_card";
import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { WuZhongShengYouSkill } from "../../skills/cards/standard/wuzhongshengyou";

export class WuZhongShengYou extends TrickCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      0,
      "wuzhongshengyou",
      "wuzhongshengyou_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName("wuzhongshengyou")
    );
  }

  get Skill() {
    return this.skill as WuZhongShengYouSkill;
  }
}
