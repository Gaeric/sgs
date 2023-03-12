import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class MaYuanYi extends Character {
  constructor(id: number) {
    super(
      id,
      "mayuanyi",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.Mobile,
      [
        ...skillLoaderInstance.getSkillsByName("jibing"),
        skillLoaderInstance.getSkillByName("wangjing"),
        skillLoaderInstance.getSkillByName("moucuan"),
      ]
    );
  }
}
