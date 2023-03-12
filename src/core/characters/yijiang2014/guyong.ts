import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class GuYong extends Character {
  constructor(id: number) {
    super(
      id,
      "guyong",
      CharacterGender.Male,
      CharacterNationality.Wu,
      3,
      3,
      GameCharacterExtensions.YiJiang2014,
      [
        skillLoaderInstance.getSkillByName("shenxing"),
        skillLoaderInstance.getSkillByName("bingyi"),
      ]
    );
  }
}
