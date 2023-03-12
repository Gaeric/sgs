import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { ZhuQueYuShanSkill } from "../../skills";
import { Skill } from "../../skills/skill";
import { WeaponCard } from "../equip_card";
import { CardSuit } from "../libs/card_props";

export class ZhuQueYuShan extends WeaponCard {
  constructor(id: number, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      "zhuqueyushan",
      "zhuqueyushan_description",
      GameCardExtensions.LegionFight,
      SkillLoader.getInstance().getSkillByName<Skill>("zhuqueyushan"),
      4
    );
  }

  public get Skill() {
    return this.skill as ZhuQueYuShanSkill;
  }
}
