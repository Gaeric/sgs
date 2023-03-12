import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class HuaTuo extends Character {
  constructor(id: number) {
    super(
      id,
      "huatuo",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.Standard,
      [
        skillLoaderInstance.getSkillByName("jijiu"),
        ...skillLoaderInstance.getSkillsByName("qingnang"),
      ]
    );
  }
}
