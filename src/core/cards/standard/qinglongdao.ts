import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Skill } from "../../skills/skill";
import { WeaponCard } from "../equip_card";
import { CardSuit } from "../libs/card_props";

export class QingLongYanYueDao extends WeaponCard {
  constructor(id: number, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      "qinglongyanyuedao",
      "qinglongyanyuedao_description",
      GameCardExtensions.Standard,
      SkillLoader.getInstance().getSkillByName<Skill>("qinglongyanyuedao"),
      3
    );
  }
}
