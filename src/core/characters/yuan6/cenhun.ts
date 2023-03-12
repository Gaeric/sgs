import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class CenHun extends Character {
  constructor(id: number) {
    super(
      id,
      "cenhun",
      CharacterGender.Male,
      CharacterNationality.Wu,
      3,
      3,
      GameCharacterExtensions.Yuan6,
      [
        ...skillLoaderInstance.getSkillsByName("jishe"),
        skillLoaderInstance.getSkillByName("lianhuo"),
      ]
    );
  }
}
