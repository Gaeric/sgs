import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class XiaHouShi extends Character {
  constructor(id: number) {
    super(
      id,
      "xiahoushi",
      CharacterGender.Female,
      CharacterNationality.Shu,
      3,
      3,
      GameCharacterExtensions.YiJiang2015,
      [
        skillLoaderInstance.getSkillByName("qiaoshi"),
        ...skillLoaderInstance.getSkillsByName("yanyu"),
      ]
    );
  }
}
