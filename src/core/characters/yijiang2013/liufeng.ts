import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { XianSi } from "../../skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class LiuFeng extends Character {
  constructor(id: number) {
    super(
      id,
      "liufeng",
      CharacterGender.Male,
      CharacterNationality.Shu,
      4,
      4,
      GameCharacterExtensions.YiJiang2013,
      [...skillLoaderInstance.getSkillsByName(XianSi.Name)]
    );
  }
}
