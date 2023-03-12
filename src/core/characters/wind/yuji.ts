import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class YuJi extends Character {
  constructor(id: number) {
    super(
      id,
      "yuji",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.Wind,
      [...skillLoaderInstance.getSkillsByName("guhuo")]
    );
  }
}
