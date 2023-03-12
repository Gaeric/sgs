import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class JiKang extends Character {
  constructor(id: number) {
    super(
      id,
      "jikang",
      CharacterGender.Male,
      CharacterNationality.Wei,
      3,
      3,
      GameCharacterExtensions.Yuan7,
      [
        skillLoaderInstance.getSkillByName("qingxian"),
        skillLoaderInstance.getSkillByName("juexiang"),
      ]
    );
  }
}
