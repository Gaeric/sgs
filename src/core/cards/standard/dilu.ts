import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { RulesBreakerSkill } from "../../skills/skill";
import { DefenseRideCard } from "../equip_card";
import { CardSuit } from "../libs/card_props";

export class DiLu extends DefenseRideCard {
  constructor(id: number, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      "dilu",
      "dilu_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName<RulesBreakerSkill>(
        "defense_horse"
      )
    );
  }
}
