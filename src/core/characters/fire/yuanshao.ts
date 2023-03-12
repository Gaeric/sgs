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
export class YuanShao extends Character {
  constructor(id: number) {
    super(
      id,
      "yuanshao",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.Fire,
      [
        ...skillLoaderInstance.getSkillsByName("luanji"),
        ...skillLoaderInstance.getSkillsByName("xueyi"),
      ]
    );
  }
}
