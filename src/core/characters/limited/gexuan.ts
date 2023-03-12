import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class GeXuan extends Character {
  constructor(id: number) {
    super(
      id,
      "gexuan",
      CharacterGender.Male,
      CharacterNationality.Wu,
      3,
      3,
      GameCharacterExtensions.Limited,
      [
        ...skillLorderInstance.getSkillsByName("lianhua"),
        skillLorderInstance.getSkillByName("zhafu"),
      ]
    );
  }
}
