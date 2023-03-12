import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class WangPing extends Character {
  constructor(id: number) {
    super(
      id,
      "wangping",
      CharacterGender.Male,
      CharacterNationality.Shu,
      4,
      4,
      GameCharacterExtensions.Shadow,
      [
        skillLoaderInstance.getSkillByName("feijun"),
        skillLoaderInstance.getSkillByName("binglve"),
      ]
    );
  }
}
