import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class WangFuZhaoLei extends Character {
  constructor(id: number) {
    super(
      id,
      "wangfuzhaolei",
      CharacterGender.Male,
      CharacterNationality.Shu,
      4,
      4,
      GameCharacterExtensions.Sincerity,
      [...skillLoaderInstance.getSkillsByName("xunyi")]
    );
  }
}
