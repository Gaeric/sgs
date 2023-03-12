import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class GodSunCe extends Character {
  constructor(id: number) {
    super(
      id,
      "god_sunce",
      CharacterGender.Male,
      CharacterNationality.God,
      6,
      1,
      GameCharacterExtensions.God,
      [
        ...skillLoaderInstance.getSkillsByName("yingba"),
        skillLoaderInstance.getSkillByName("god_fuhai"),
        ...skillLoaderInstance.getSkillsByName("pinghe"),
      ]
    );
  }
}
