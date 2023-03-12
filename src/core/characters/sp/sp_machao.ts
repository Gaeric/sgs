import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class SPMaChao extends Character {
  constructor(id: number) {
    super(
      id,
      "sp_machao",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.SP,
      [
        skillLorderInstance.getSkillByName("zhuiji"),
        skillLorderInstance.getSkillByName("shichou"),
      ]
    );
  }
}
