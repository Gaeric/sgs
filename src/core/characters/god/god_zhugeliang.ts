import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();
export class GodZhuGeLiang extends Character {
  constructor(id: number) {
    super(
      id,
      "god_zhugeliang",
      CharacterGender.Male,
      CharacterNationality.God,
      3,
      3,
      GameCharacterExtensions.God,
      [
        ...skillLoaderInstance.getSkillsByName("qixing"),
        ...skillLoaderInstance.getSkillsByName("kuangfeng"),
        ...skillLoaderInstance.getSkillsByName("dawu"),
      ]
    );
  }
}
