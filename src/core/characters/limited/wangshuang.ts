import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class WangShuang extends Character {
  constructor(id: number) {
    super(
      id,
      "wangshuang",
      CharacterGender.Male,
      CharacterNationality.Wei,
      8,
      8,
      GameCharacterExtensions.Limited,
      [...skillLorderInstance.getSkillsByName("zhuilie")]
    );
  }
}
