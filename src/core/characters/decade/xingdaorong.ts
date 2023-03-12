import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class XingDaoRong extends Character {
  constructor(id: number) {
    super(
      id,
      "xingdaorong",
      CharacterGender.Male,
      CharacterNationality.Qun,
      6,
      4,
      GameCharacterExtensions.Decade,
      [skillLorderInstance.getSkillByName("xuhe")]
    );
  }
}
