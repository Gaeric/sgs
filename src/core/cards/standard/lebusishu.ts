import { CardSuit } from "../libs/card_props";
import type { RealCardId } from "../libs/card_props";
import { DelayedTrick, TrickCard } from "../trick_card";
import { GameCardExtensions, INFINITE_DISTANCE } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { LeBuSiShuSkill } from "../../skills";

@DelayedTrick
export class LeBuSiShu extends TrickCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      INFINITE_DISTANCE,
      "lebusishu",
      "lebusishu_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName("lebusishu")
    );
  }

  get Skill() {
    return this.skill as LeBuSiShuSkill;
  }
}
