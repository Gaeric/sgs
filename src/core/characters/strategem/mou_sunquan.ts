import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import {
  Character,
  CharacterGender,
  CharacterNationality,
  Lord,
} from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

@Lord
export class MouSunQuan extends Character {
  constructor(id: number) {
    super(
      id,
      "mou_sunquan",
      CharacterGender.Male,
      CharacterNationality.Wu,
      4,
      4,
      GameCharacterExtensions.Strategem,
      [
        skillLoaderInstance.getSkillByName("mou_zhiheng"),
        ...skillLoaderInstance.getSkillsByName("tongye"),
        skillLoaderInstance.getSkillByName("mou_jiuyuan"),
      ]
    );
  }
}
