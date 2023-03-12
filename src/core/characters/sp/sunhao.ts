import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import {
  Character,
  CharacterGender,
  CharacterNationality,
  Lord,
} from "../character";

const skillLorderInstance = SkillLoader.getInstance();

@Lord
export class SunHao extends Character {
  constructor(id: number) {
    super(
      id,
      "sunhao",
      CharacterGender.Male,
      CharacterNationality.Wu,
      5,
      5,
      GameCharacterExtensions.SP,
      [
        ...skillLorderInstance.getSkillsByName("canshi"),
        skillLorderInstance.getSkillByName("chouhai"),
        skillLorderInstance.getSkillByName("guiming"),
      ]
    );
  }
}
