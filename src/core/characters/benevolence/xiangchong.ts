import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class XiangChong extends Character {
  constructor(id: number) {
    super(
      id,
      "xiangchong",
      CharacterGender.Male,
      CharacterNationality.Shu,
      4,
      4,
      GameCharacterExtensions.Benevolence,
      [skillLoaderInstance.getSkillByName("guying")]
    );
  }
}
