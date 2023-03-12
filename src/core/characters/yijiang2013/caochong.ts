import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { ChengXiang } from "../../skills/characters/yijiang2013/chengxiang";
import { RenXin } from "../../skills/characters/yijiang2013/renxin";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class CaoChong extends Character {
  constructor(id: number) {
    super(
      id,
      "caochong",
      CharacterGender.Male,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.YiJiang2013,
      [
        skillLoaderInstance.getSkillByName(ChengXiang.Name),
        skillLoaderInstance.getSkillByName(RenXin.Name),
      ]
    );
  }
}
