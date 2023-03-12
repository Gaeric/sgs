import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class CaiMaoZhangYun extends Character {
  constructor(id: number) {
    super(
      id,
      "caimaozhangyun",
      CharacterGender.Male,
      CharacterNationality.Wei,
      4,
      4,
      GameCharacterExtensions.Decade,
      [
        skillLorderInstance.getSkillByName("lianzhou"),
        skillLorderInstance.getSkillByName("jinglan"),
      ]
    );
  }
}
