import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { HanBingJianSkill } from "../../skills/cards/standard/hanbingjian";
import { Skill } from "../../skills/skill";
import { WeaponCard } from "../equip_card";
import { CardSuit } from "../libs/card_props";

export class HanBingJian extends WeaponCard {
  constructor(id: number, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      "hanbingjian",
      "hanbingjian_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName<Skill>("hanbingjian"),
      2
    );
  }

  public get Skill() {
    return this.skill as HanBingJianSkill;
  }
}
