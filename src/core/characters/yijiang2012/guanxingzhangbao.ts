import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class GuanXingZhangBao extends Character {
  constructor(id: number) {
    super(
      id,
      "guanxingzhangbao",
      CharacterGender.Male,
      CharacterNationality.Shu,
      4,
      4,
      GameCharacterExtensions.YiJiang2012,
      [...skillLoaderInstance.getSkillsByName("fuhun")]
    );
  }
}
