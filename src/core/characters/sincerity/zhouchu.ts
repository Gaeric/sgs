import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class ZhouChu extends Character {
  constructor(id: number) {
    super(
      id,
      "zhouchu",
      CharacterGender.Male,
      CharacterNationality.Wu,
      4,
      4,
      GameCharacterExtensions.Sincerity,
      [
        ...skillLoaderInstance.getSkillsByName("xianghai"),
        ...skillLoaderInstance.getSkillsByName("chuhai"),
      ]
    );
  }
}
