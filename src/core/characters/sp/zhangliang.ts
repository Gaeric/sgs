import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class ZhangLiang extends Character {
  constructor(id: number) {
    super(
      id,
      "zhangliang",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.SP,
      [
        ...skillLorderInstance.getSkillsByName("jijun"),
        skillLorderInstance.getSkillByName("fangtong"),
      ]
    );
  }
}
