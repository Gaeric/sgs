import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class XinXinPi extends Character {
  constructor(id: number) {
    super(
      id,
      "xin_xinpi",
      CharacterGender.Male,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.Sincerity,
      [
        skillLoaderInstance.getSkillByName("xin_yinju"),
        skillLoaderInstance.getSkillByName("xin_chijie"),
      ]
    );
  }
}
