import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class ZhouYu extends Character {
  constructor(id: number) {
    super(
      id,
      "zhouyu",
      CharacterGender.Male,
      CharacterNationality.Wu,
      3,
      3,
      GameCharacterExtensions.Standard,
      [
        ...skillLoaderInstance.getSkillsByName("yingzi"),
        skillLoaderInstance.getSkillByName("fanjian"),
      ]
    );
  }
}
