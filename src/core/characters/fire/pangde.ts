import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class Pangde extends Character {
  constructor(id: number) {
    super(
      id,
      "pangde",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.Fire,
      [
        skillLoaderInstance.getSkillByName("mashu"),
        ...skillLoaderInstance.getSkillsByName("jianchu"),
      ]
    );
  }
}
