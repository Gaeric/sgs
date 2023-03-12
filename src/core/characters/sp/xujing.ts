import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class XuJing extends Character {
  constructor(id: number) {
    super(
      id,
      "xujing",
      CharacterGender.Male,
      CharacterNationality.Shu,
      3,
      3,
      GameCharacterExtensions.SP,
      [
        skillLorderInstance.getSkillByName("yuxu"),
        ...skillLorderInstance.getSkillsByName("shijian"),
      ]
    );
  }
}
