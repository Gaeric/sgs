import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class CaoChun extends Character {
  constructor(id: number) {
    super(
      id,
      "caochun",
      CharacterGender.Male,
      CharacterNationality.Wei,
      4,
      4,
      GameCharacterExtensions.Limited,
      [...skillLorderInstance.getSkillsByName("shanjia")]
    );
  }
}
