import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class TongYuanC extends Character {
  constructor(id: number) {
    super(
      id,
      "tongyuan_c",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.Decade,
      [
        ...skillLorderInstance.getSkillsByName("chaofeng"),
        skillLorderInstance.getSkillByName("chuanshu"),
      ]
    );
  }
}
