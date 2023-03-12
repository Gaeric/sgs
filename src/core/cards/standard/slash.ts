import { BasicCard } from "../basic_card";
import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { SlashSkill } from "../../skills/cards/standard/slash";
import { Multiple } from "../card";
import type { CardSuit, RealCardId } from "../libs/card_props";

@Multiple
export class Slash extends BasicCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      1,
      "slash",
      "slash_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName("slash")
    );
  }

  public get Skill() {
    return this.skill as SlashSkill;
  }
}
