import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class QuYi extends Character {
  constructor(id: number) {
    super(
      id,
      "quyi",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.SP,
      [
        skillLorderInstance.getSkillByName("fuji"),
        skillLorderInstance.getSkillByName("jiaozi"),
      ]
    );
  }
}
