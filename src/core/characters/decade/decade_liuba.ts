import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class DecadeLiuBa extends Character {
  constructor(id: number) {
    super(
      id,
      "decade_liuba",
      CharacterGender.Male,
      CharacterNationality.Shu,
      3,
      3,
      GameCharacterExtensions.Decade,
      [
        skillLorderInstance.getSkillByName("zhubi"),
        ...skillLorderInstance.getSkillsByName("liuzhuan"),
      ]
    );
  }
}
