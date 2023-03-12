import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class XiaHouJie extends Character {
  constructor(id: number) {
    super(
      id,
      "xiahoujie",
      CharacterGender.Male,
      CharacterNationality.Wei,
      5,
      5,
      GameCharacterExtensions.Decade,
      [
        skillLorderInstance.getSkillByName("liedan"),
        ...skillLorderInstance.getSkillsByName("zhuangdan"),
      ]
    );
  }
}
