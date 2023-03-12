import { GameCardExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { TianZuo } from "../../skills";
import { QiZhengXiangShengSkill } from "../../skills/cards/character_skills/qizhengxiangsheng";
import { UniqueCard } from "../card";
import type { CardSuit, RealCardId } from "../libs/card_props";
import { TrickCard } from "../trick_card";

@UniqueCard<QiZhengXiangSheng>({ bySkill: TianZuo.GeneralName })
export class QiZhengXiangSheng extends TrickCard {
  constructor(id: RealCardId, cardNumber: number, suit: CardSuit) {
    super(
      id,
      cardNumber,
      suit,
      0,
      "qizhengxiangsheng",
      "qizhengxiangsheng_description",
      GameCardExtensions.CharacterSkills,
      SkillLoader.getInstance().getSkillByName("qizhengxiangsheng")
    );
  }

  public get Skill() {
    return this.skill as QiZhengXiangShengSkill;
  }
}
