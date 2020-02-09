import { Card, CardType } from './card';

import { GameCardExtensions } from 'core/game/game_props';
import { AllStage } from 'core/game/stage_processor';
import { RulesBreakerSkill, Skill } from 'core/skills/skill';
import { CardSuit, RealCardId } from './libs/card_props';

export abstract class EquipCard extends Card {
  protected cardType = [CardType.Equip];
  protected effectUseDistance = 0;

  constructor(subType: CardType) {
    super();
    this.cardType.push(subType);
  }
}

export abstract class WeaponCard extends EquipCard {
  protected generalName: string;
  constructor(
    protected id: RealCardId,
    protected cardNumber: number,
    protected suit: CardSuit,
    protected name: string,
    protected description: string,
    protected skills: Skill[],
    private attackDistance: number,
    generalName?: string,
  ) {
    super(CardType.Weapon);
    this.generalName = generalName || this.name;
  }

  public get AttackDistance() {
    return this.attackDistance;
  }
}
export abstract class ArmorCard extends EquipCard {
  protected abstract triggeredStage: AllStage;
  protected generalName: string;

  constructor(
    protected id: RealCardId,
    protected cardNumber: number,
    protected suit: CardSuit,
    protected name: string,
    protected description: string,
    protected skills: Skill[],
    generalName?: string,
  ) {
    super(CardType.Armor);
    this.generalName = generalName || this.name;
  }
}

export abstract class RideCard extends EquipCard {
  protected abstract skill: RulesBreakerSkill;

  public get Skill(): RulesBreakerSkill {
    return this.skill;
  }

  public get OffenseDistance() {
    return this.skill.breakOffenseDistance();
  }

  public get DefenseDistance() {
    return this.skill.breakDefenseDistance();
  }
}

export class DefenseRideCard extends RideCard {
  protected generalName: string;

  constructor(
    protected id: RealCardId,
    protected cardNumber: number,
    protected suit: CardSuit,
    protected name: string,
    protected description: string,
    protected fromPackage: GameCardExtensions,
    protected skill: RulesBreakerSkill,
    generalName?: string,
  ) {
    super(CardType.DefenseRide);
    this.generalName = generalName || this.name;
  }
}

export class OffenseRideCard extends RideCard {
  protected generalName: string;

  constructor(
    protected id: RealCardId,
    protected cardNumber: number,
    protected suit: CardSuit,
    protected name: string,
    protected description: string,
    protected fromPackage: GameCardExtensions,
    protected skill: RulesBreakerSkill,
    generalName?: string,
  ) {
    super(CardType.OffenseRide);
    this.generalName = generalName || this.name;
  }
}
