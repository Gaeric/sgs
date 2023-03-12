import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class YangWan extends Character {
  constructor(id: number) {
    super(
      id,
      "yangwan",
      CharacterGender.Female,
      CharacterNationality.Shu,
      3,
      3,
      GameCharacterExtensions.Limited,
      [
        skillLorderInstance.getSkillByName("youyan"),
        skillLorderInstance.getSkillByName("zhuihuan"),
      ]
    );
  }
}
