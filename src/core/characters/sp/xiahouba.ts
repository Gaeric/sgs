import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class XiaHouBa extends Character {
  constructor(id: number) {
    super(
      id,
      "xiahouba",
      CharacterGender.Male,
      CharacterNationality.Shu,
      4,
      4,
      GameCharacterExtensions.SP,
      [skillLorderInstance.getSkillByName("baobian")]
    );
  }
}
