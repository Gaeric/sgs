import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { RulesBreakerSkill } from "../../skills/skill";
import { OffenseRideCard } from "../equip_card";
import { CardSuit } from "../libs/card_props";

export class ZiXing extends OffenseRideCard {
  constructor(id: number, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      "zixing",
      "zixing_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName<RulesBreakerSkill>(
        "offense_horse"
      )
    );
  }
}
