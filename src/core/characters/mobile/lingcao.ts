import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class LingCao extends Character {
  constructor(id: number) {
    super(
      id,
      "lingcao",
      CharacterGender.Male,
      CharacterNationality.Wu,
      4,
      4,
      GameCharacterExtensions.Mobile,
      [skillLoaderInstance.getSkillByName("dujin")]
    );
  }
}
