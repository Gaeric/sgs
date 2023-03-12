import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { ZhangBaSheMaoSkill } from "../../skills";
import { Skill } from "../../skills/skill";
import { WeaponCard } from "../equip_card";
import { CardSuit } from "../libs/card_props";

export class ZhangBaSheMao extends WeaponCard {
  constructor(id: number, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      "zhangbashemao",
      "zhangbashemao_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName<Skill>("zhangbashemao"),
      3
    );
  }

  public get Skill() {
    return this.skill as ZhangBaSheMaoSkill;
  }
}
