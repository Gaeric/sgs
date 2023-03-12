import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class SPDiaochan extends Character {
  constructor(id: number) {
    super(
      id,
      "sp_diaochan",
      CharacterGender.Female,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.SP,
      [
        ...skillLorderInstance.getSkillsByName("lihun"),
        skillLorderInstance.getSkillByName("biyue"),
      ]
    );
  }
}
