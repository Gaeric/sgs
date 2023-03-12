import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class LiuXie extends Character {
  constructor(id: number) {
    super(
      id,
      "liuxie",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.SP,
      [
        skillLorderInstance.getSkillByName("tianming"),
        skillLorderInstance.getSkillByName("mizhao"),
      ]
    );
  }
}
