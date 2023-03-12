import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class XunChen extends Character {
  constructor(id: number) {
    super(
      id,
      "xunchen",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.Decade,
      [
        ...skillLorderInstance.getSkillsByName("fenglve"),
        ...skillLorderInstance.getSkillsByName("anyong"),
      ]
    );
  }
}
