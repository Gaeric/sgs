import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class XunYou extends Character {
  constructor(id: number) {
    super(
      id,
      "xunyou",
      CharacterGender.Male,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.YiJiang2012,
      [
        skillLoaderInstance.getSkillByName("qice"),
        skillLoaderInstance.getSkillByName("zhiyu"),
      ]
    );
  }
}
