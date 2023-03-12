import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class YjcmJuShou extends Character {
  constructor(id: number) {
    super(
      id,
      "yjcm_jushou",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.YiJiang2014,
      [
        ...skillLoaderInstance.getSkillsByName("jianying"),
        ...skillLoaderInstance.getSkillsByName("shibei"),
      ]
    );
  }
}
