import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class GodCaoCao extends Character {
  constructor(id: number) {
    super(
      id,
      "god_caocao",
      CharacterGender.Male,
      CharacterNationality.God,
      3,
      3,
      GameCharacterExtensions.God,
      [
        skillLoaderInstance.getSkillByName("guixin"),
        skillLoaderInstance.getSkillByName("feiying"),
      ]
    );
  }
}
