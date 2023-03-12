import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { ZongXuan } from "../../skills";
import { ZhiYan } from "../../skills/characters/yijiang2013/zhiyan";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class YuFan extends Character {
  constructor(id: number) {
    super(
      id,
      "yufan",
      CharacterGender.Male,
      CharacterNationality.Wu,
      3,
      3,
      GameCharacterExtensions.YiJiang2013,
      [
        skillLoaderInstance.getSkillByName(ZongXuan.Name),
        skillLoaderInstance.getSkillByName(ZhiYan.Name),
      ]
    );
  }
}
