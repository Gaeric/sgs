import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class WenPin extends Character {
  constructor(id: number) {
    super(
      id,
      "wenpin",
      CharacterGender.Male,
      CharacterNationality.Wei,
      4,
      4,
      GameCharacterExtensions.SP,
      [skillLorderInstance.getSkillByName("zhenwei")]
    );
  }
}
