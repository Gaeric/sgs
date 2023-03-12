import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class ShiXie extends Character {
  constructor(id: number) {
    super(
      id,
      "shixie",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.SP,
      [
        skillLorderInstance.getSkillByName("biluan"),
        skillLorderInstance.getSkillByName("lixia"),
      ]
    );
  }
}
