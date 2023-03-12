import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class WangRong extends Character {
  constructor(id: number) {
    super(
      id,
      "wangrong",
      CharacterGender.Female,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.Biographies,
      [
        ...skillLoaderInstance.getSkillsByName("minsi"),
        skillLoaderInstance.getSkillByName("jijing"),
        skillLoaderInstance.getSkillByName("zhuide"),
      ]
    );
  }
}
