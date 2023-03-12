import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class GongSunYuan extends Character {
  constructor(id: number) {
    super(
      id,
      "gongsunyuan",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.YiJiang2015,
      [...skillLoaderInstance.getSkillsByName("huaiyi")]
    );
  }
}
