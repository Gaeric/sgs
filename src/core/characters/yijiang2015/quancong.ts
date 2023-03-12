import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class QuanCong extends Character {
  constructor(id: number) {
    super(
      id,
      "quancong",
      CharacterGender.Male,
      CharacterNationality.Wu,
      4,
      4,
      GameCharacterExtensions.YiJiang2015,
      [...skillLoaderInstance.getSkillsByName("yaoming")]
    );
  }
}
