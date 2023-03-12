import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { MuNiuLiuMaSkill } from "../../skills/cards/legion_fight/muniuliuma";
import { PreciousCard } from "../equip_card";
import { CardSuit } from "../libs/card_props";

export class MuNiuLiuMa extends PreciousCard {
  constructor(id: number, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      "muniuliuma",
      "muniuliuma_description",
      GameCardExtensions.LegionFight,
      SkillLoader.getInstance().getSkillByName("muniuliuma")
    );
  }

  public get Skill() {
    return this.skill as MuNiuLiuMaSkill;
  }
}
