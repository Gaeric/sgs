import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class LiaoHua extends Character {
  constructor(id: number) {
    super(
      id,
      "liaohua",
      CharacterGender.Male,
      CharacterNationality.Shu,
      4,
      4,
      GameCharacterExtensions.YiJiang2012,
      [
        skillLoaderInstance.getSkillByName("dangxian"),
        skillLoaderInstance.getSkillByName("fuli"),
      ]
    );
  }
}
