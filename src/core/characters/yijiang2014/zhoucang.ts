import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class ZhouCang extends Character {
  constructor(id: number) {
    super(
      id,
      "zhoucang",
      CharacterGender.Male,
      CharacterNationality.Shu,
      4,
      4,
      GameCharacterExtensions.YiJiang2014,
      [skillLoaderInstance.getSkillByName("zhongyong")]
    );
  }
}
