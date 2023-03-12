import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class CaiZhenJi extends Character {
  constructor(id: number) {
    super(
      id,
      "caizhenji",
      CharacterGender.Female,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.Benevolence,
      [
        skillLoaderInstance.getSkillByName("sheyi"),
        skillLoaderInstance.getSkillByName("tianyin"),
      ]
    );
  }
}
