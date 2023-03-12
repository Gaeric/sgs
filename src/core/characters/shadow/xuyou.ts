import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class XuYou extends Character {
  constructor(id: number) {
    super(
      id,
      "xuyou",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.Shadow,
      [
        ...skillLoaderInstance.getSkillsByName("chenglve"),
        ...skillLoaderInstance.getSkillsByName("shicai"),
        skillLoaderInstance.getSkillByName("cunmu"),
      ]
    );
  }
}
