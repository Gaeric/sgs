import { BenevolencePackage } from "../../characters/benevolence";
import { BiographiesPackage } from "../../characters/biographies";
import { Character } from "../../characters/character";
import { DecadePackage } from "../../characters/decade";
import { FireCharacterPackage } from "../../characters/fire";
import { ForestCharacterPackage } from "../../characters/forest";
import { GodCharacterPackage } from "../../characters/god";
import { LimitedPackage } from "../../characters/limited";
import { MobilePackage } from "../../characters/mobile";
import { MountainCharacterPackage } from "../../characters/mountain";
import { PvePackage } from "../../characters/pve";
import { ShadowCharacterPackage } from "../../characters/shadow";
import { SincerityCharacterPackage } from "../../characters/sincerity";
import { SpPackage } from "../../characters/sp";
import { SparkPackage } from "../../characters/spark";
import { StandardCharacterPackage } from "../../characters/standard";
import { StrategemPackage } from "../../characters/strategem";
import { ThunderCharacterPackage } from "../../characters/thunder";
import { WindCharacterPackage } from "../../characters/wind";
import { WisdomPackage } from "../../characters/wisdom";
import { YiJiang2011Package } from "../../characters/yijiang2011";
import { YiJiang2012Package } from "../../characters/yijiang2012";
import { YiJiang2013Package } from "../../characters/yijiang2013";
import { YiJiang2014Package } from "../../characters/yijiang2014";
import { YiJiang2015Package } from "../../characters/yijiang2015";
import { Yuan6Package } from "../../characters/yuan6";
import { Yuan7Package } from "../../characters/yuan7";
import { GameCharacterExtensions } from "../game_props";

export type CharacterPackages = {
  [K in GameCharacterExtensions]: Character[];
};
export type CharacterPackage<Extension extends GameCharacterExtensions> = {
  [K in Extension]: Character[];
};
export type CharacterPackageLoader = (index: number) => Character[];

export class CharacterLoader {
  private static instance: CharacterLoader;
  private characters: CharacterPackages = {} as any;

  private constructor() {
    this.loadCharacters();
  }

  private static readonly CharacterLoaders: {
    [P in GameCharacterExtensions]: CharacterPackageLoader;
  } = {
    [GameCharacterExtensions.Standard]: StandardCharacterPackage,
    [GameCharacterExtensions.Wind]: WindCharacterPackage,
    [GameCharacterExtensions.Fire]: FireCharacterPackage,
    [GameCharacterExtensions.Forest]: ForestCharacterPackage,
    [GameCharacterExtensions.Mountain]: MountainCharacterPackage,
    [GameCharacterExtensions.Shadow]: ShadowCharacterPackage,
    [GameCharacterExtensions.Thunder]: ThunderCharacterPackage,
    [GameCharacterExtensions.God]: GodCharacterPackage,
    [GameCharacterExtensions.YiJiang2011]: YiJiang2011Package,
    [GameCharacterExtensions.YiJiang2012]: YiJiang2012Package,
    [GameCharacterExtensions.YiJiang2013]: YiJiang2013Package,
    [GameCharacterExtensions.YiJiang2014]: YiJiang2014Package,
    [GameCharacterExtensions.YiJiang2015]: YiJiang2015Package,
    [GameCharacterExtensions.Yuan6]: Yuan6Package,
    [GameCharacterExtensions.Yuan7]: Yuan7Package,
    [GameCharacterExtensions.SP]: SpPackage,
    [GameCharacterExtensions.Spark]: SparkPackage,
    [GameCharacterExtensions.Decade]: DecadePackage,
    [GameCharacterExtensions.Limited]: LimitedPackage,
    [GameCharacterExtensions.Biographies]: BiographiesPackage,
    [GameCharacterExtensions.Mobile]: MobilePackage,
    [GameCharacterExtensions.Wisdom]: WisdomPackage,
    [GameCharacterExtensions.Sincerity]: SincerityCharacterPackage,
    [GameCharacterExtensions.Benevolence]: BenevolencePackage,
    [GameCharacterExtensions.Strategem]: StrategemPackage,
    [GameCharacterExtensions.Pve]: PvePackage,
  };

  public static getInstance() {
    if (!this.instance) {
      this.instance = new CharacterLoader();
    }

    return this.instance;
  }

  private loadCharacters() {
    let index = 0;
    for (const [packageName, loader] of Object.entries(
      CharacterLoader.CharacterLoaders
    )) {
      const characters = loader(index);
      this.characters[packageName] = characters;

      index += characters.length;
    }
  }

  public getAllCharacters() {
    return Object.values(this.characters).reduce<Character[]>(
      (addedCards, characters) => addedCards.concat(characters),
      []
    );
  }

  public getPackages(...extensions: GameCharacterExtensions[]): Character[] {
    return extensions.reduce<Character[]>(
      (addedCards, extension) => addedCards.concat(this.characters[extension]),
      []
    );
  }
}
