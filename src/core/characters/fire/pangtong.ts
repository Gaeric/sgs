import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class PangTong extends Character {
  constructor(id: number) {
    super(
      id,
      "pangtong",
      CharacterGender.Male,
      CharacterNationality.Shu,
      3,
      3,
      GameCharacterExtensions.Fire,
      [
        ...skillLoaderInstance.getSkillsByName("lianhuan"),
        skillLoaderInstance.getSkillByName("niepan"),
      ]
    );
  }
}
