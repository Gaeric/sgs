import { CardSuit } from "../libs/card_props";
import type { RealCardId } from "../libs/card_props";
import { DelayedTrick, TrickCard } from "../trick_card";
import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { LightningSkill } from "../../skills/cards/standard/lightning";

@DelayedTrick
export class Lightning extends TrickCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      0,
      "lightning",
      "lightning_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName("lightning")
    );
  }

  get Skill() {
    return this.skill as LightningSkill;
  }
}
