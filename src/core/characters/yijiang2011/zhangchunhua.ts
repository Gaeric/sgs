import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class ZhangChunHua extends Character {
  constructor(id: number) {
    super(
      id,
      "zhangchunhua",
      CharacterGender.Female,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.YiJiang2011,
      [
        skillLoaderInstance.getSkillByName("jueqing"),
        skillLoaderInstance.getSkillByName("shangshi"),
      ]
    );
  }
}
