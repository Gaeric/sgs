import { CharacterNationality } from "../../../characters/character";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  GameStartStage,
  PhaseChangeStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { MarkEnum } from "../../../shares/types/mark_list";
import {
  CommonSkill,
  LordSkill,
  RulesBreakerSkill,
  ShadowSkill,
  TriggerSkill,
} from "../../skill";

@LordSkill
@CommonSkill({ name: "xueyi", description: "xueyi_description" })
export class XueYi extends TriggerSkill {
  public isAutoTrigger() {
    return true;
  }

  public isTriggerable(
    content: ServerEventFinder<GameEventIdentifiers.GameStartEvent>,
    stage: AllStage
  ) {
    return stage === GameStartStage.GameStarting;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.GameStartEvent>
  ) {
    return (
      room
        .getAlivePlayersFrom()
        .filter((player) => player.Nationality === CharacterNationality.Qun)
        .length > 0
    );
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const allies = room
      .getAlivePlayersFrom()
      .filter(
        (player) => player.Nationality === CharacterNationality.Qun
      ).length;
    allies > 0 && room.setMark(event.fromId, MarkEnum.XueYi, allies);

    return true;
  }
}

@ShadowSkill
@LordSkill
@CommonSkill({ name: XueYi.GeneralName, description: XueYi.Description })
export class XueYiShadow extends TriggerSkill {
  public isTriggerable(
    content: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>,
    stage: AllStage
  ) {
    return (
      content.to === PlayerPhase.PhaseBegin &&
      stage === PhaseChangeStage.AfterPhaseChanged
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>
  ) {
    return owner.Id === content.toPlayer && owner.getMark(MarkEnum.XueYi) > 0;
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { fromId } = event;

    room.addMark(fromId, MarkEnum.XueYi, -1);
    await room.drawCards(1, fromId, "top", fromId, this.Name);

    return true;
  }
}

@ShadowSkill
@LordSkill
@CommonSkill({ name: XueYiShadow.Name, description: XueYiShadow.Description })
export class XueYiBuff extends RulesBreakerSkill {
  public breakAdditionalCardHoldNumber(room: Room, owner: Player) {
    return owner.getMark(MarkEnum.XueYi) * 2;
  }
}
