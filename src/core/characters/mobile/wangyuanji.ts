import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class WangYuanJi extends Character {
  constructor(id: number) {
    super(
      id,
      "wangyuanji",
      CharacterGender.Female,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.Mobile,
      [
        ...skillLoaderInstance.getSkillsByName("qianchong"),
        skillLoaderInstance.getSkillByName("shangjian"),
      ]
    );
  }
}
