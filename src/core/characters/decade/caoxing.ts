import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class CaoXing extends Character {
  constructor(id: number) {
    super(
      id,
      "caoxing",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.Decade,
      [
        ...skillLorderInstance.getSkillsByName("liushi"),
        skillLorderInstance.getSkillByName("zhanwan"),
      ]
    );
  }
}
