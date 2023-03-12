import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class MouYuJin extends Character {
  constructor(id: number) {
    super(
      id,
      "mou_yujin",
      CharacterGender.Male,
      CharacterNationality.Wei,
      4,
      4,
      GameCharacterExtensions.Strategem,
      [
        skillLoaderInstance.getSkillByName("xiayuan"),
        skillLoaderInstance.getSkillByName("mou_jieyue"),
      ]
    );
  }
}
