import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class GanNing extends Character {
  constructor(id: number) {
    super(
      id,
      "ganning",
      CharacterGender.Male,
      CharacterNationality.Wu,
      4,
      4,
      GameCharacterExtensions.Standard,
      [
        skillLoaderInstance.getSkillByName("qixi"),
        skillLoaderInstance.getSkillByName("fenwei"),
      ]
    );
  }
}
