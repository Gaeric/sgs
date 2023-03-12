import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class SiMaLang extends Character {
  constructor(id: number) {
    super(
      id,
      "simalang",
      CharacterGender.Male,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.SP,
      [
        skillLorderInstance.getSkillByName("junbing"),
        skillLorderInstance.getSkillByName("quji"),
      ]
    );
  }
}
