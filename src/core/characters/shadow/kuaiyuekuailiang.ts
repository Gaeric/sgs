import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class KuaiYueKuaiLiang extends Character {
  constructor(id: number) {
    super(
      id,
      "kuaiyuekuailiang",
      CharacterGender.Male,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.Shadow,
      [
        skillLoaderInstance.getSkillByName("jianxiang"),
        ...skillLoaderInstance.getSkillsByName("shenshi"),
      ]
    );
  }
}
