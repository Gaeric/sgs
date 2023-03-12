import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import {
  Armor,
  Character,
  CharacterGender,
  CharacterNationality,
} from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

@Armor(1)
export class MouHuaXiong extends Character {
  constructor(id: number) {
    super(
      id,
      "mou_huaxiong",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      3,
      GameCharacterExtensions.Strategem,
      [
        skillLoaderInstance.getSkillByName("mou_yaowu"),
        ...skillLoaderInstance.getSkillsByName("yangwei"),
      ]
    );
  }
}
