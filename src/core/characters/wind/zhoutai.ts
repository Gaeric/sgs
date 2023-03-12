import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class ZhouTai extends Character {
  constructor(id: number) {
    super(
      id,
      "zhoutai",
      CharacterGender.Male,
      CharacterNationality.Wu,
      4,
      4,
      GameCharacterExtensions.Wind,
      [
        skillLoaderInstance.getSkillByName("fenji"),
        ...skillLoaderInstance.getSkillsByName("buqu"),
      ]
    );
  }
}
