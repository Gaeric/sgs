import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class ZuMao extends Character {
  constructor(id: number) {
    super(
      id,
      "zumao",
      CharacterGender.Male,
      CharacterNationality.Wu,
      4,
      4,
      GameCharacterExtensions.SP,
      [
        skillLorderInstance.getSkillByName("yinbing"),
        skillLorderInstance.getSkillByName("juedi"),
      ]
    );
  }
}
