import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class GuoSi extends Character {
  constructor(id: number) {
    super(
      id,
      "guosi",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.Decade,
      [
        ...skillLorderInstance.getSkillsByName("tanbei"),
        skillLorderInstance.getSkillByName("sidao"),
      ]
    );
  }
}
