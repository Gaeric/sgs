import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class MaLiang extends Character {
  constructor(id: number) {
    super(
      id,
      "maliang",
      CharacterGender.Male,
      CharacterNationality.Shu,
      3,
      3,
      GameCharacterExtensions.SP,
      [
        ...skillLorderInstance.getSkillsByName("zishu"),
        ...skillLorderInstance.getSkillsByName("yingyuan"),
      ]
    );
  }
}
