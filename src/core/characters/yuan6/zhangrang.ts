import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class ZhangRang extends Character {
  constructor(id: number) {
    super(
      id,
      "zhangrang",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.Yuan6,
      [...skillLoaderInstance.getSkillsByName("taoluan")]
    );
  }
}
