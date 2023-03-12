import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";

@CommonSkill({ name: "chuanyun", description: "chuanyun_description" })
export class ChuanYun extends TriggerSkill {
  public get RelatedCharacters(): string[] {
    return ["tongyuan_c"];
  }

  public audioIndex(characterName?: string): number {
    return characterName && this.RelatedCharacters.includes(characterName)
      ? 1
      : 0;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ): boolean {
    return stage === AimStage.AfterAim;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    return (
      content.fromId === owner.Id &&
      Sanguosha.getCardById(content.byCardId).GeneralName === "slash" &&
      room.getPlayerById(content.toId).getCardIds(PlayerCardsArea.EquipArea)
        .length > 0
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const to = room.getPlayerById(
      (
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>
      ).toId
    );
    const equips = to.getCardIds(PlayerCardsArea.EquipArea);
    await room.dropCards(
      CardMoveReason.SelfDrop,
      [equips[Math.floor(Math.random() * equips.length)]],
      to.Id,
      to.Id,
      this.Name
    );

    return true;
  }
}
