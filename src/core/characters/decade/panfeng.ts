import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class PanFeng extends Character {
  constructor(id: number) {
    super(
      id,
      "panfeng",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.Decade,
      [skillLorderInstance.getSkillByName("kuangfu")]
    );
  }
}
