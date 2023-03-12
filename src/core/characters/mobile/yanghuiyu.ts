import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class YangHuiYu extends Character {
  constructor(id: number) {
    super(
      id,
      "yanghuiyu",
      CharacterGender.Female,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.Mobile,
      [
        ...skillLoaderInstance.getSkillsByName("hongyi"),
        skillLoaderInstance.getSkillByName("quanfeng"),
      ]
    );
  }
}
