import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class DecadeDengZhi extends Character {
  constructor(id: number) {
    super(
      id,
      "decade_dengzhi",
      CharacterGender.Male,
      CharacterNationality.Shu,
      3,
      3,
      GameCharacterExtensions.Decade,
      [
        skillLorderInstance.getSkillByName("jianliang"),
        skillLorderInstance.getSkillByName("weimeng"),
      ]
    );
  }
}
