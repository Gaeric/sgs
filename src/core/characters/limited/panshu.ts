import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class PanShu extends Character {
  constructor(id: number) {
    super(
      id,
      "panshu",
      CharacterGender.Female,
      CharacterNationality.Wu,
      3,
      3,
      GameCharacterExtensions.Limited,
      [
        skillLorderInstance.getSkillByName("weiyi"),
        ...skillLorderInstance.getSkillsByName("jinzhi"),
      ]
    );
  }
}
