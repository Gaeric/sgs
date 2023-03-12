import { CardType, VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  CardUseStage,
  PhaseChangeStage,
  PhaseStageChangeStage,
  PlayerPhase,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { OnDefineReleaseTiming } from "../../skill_hooks";
import {
  CommonSkill,
  PersistentSkill,
  ShadowSkill,
} from "../../skill_wrappers";

@CommonSkill({
  name: "zhuling_jixian",
  description: "zhuling_jixian_description",
})
export class ZhuLingJiXian extends TriggerSkill {
  public isAutoTrigger(): boolean {
    return true;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      content.playerId === owner.Id &&
      content.toStage === PlayerPhaseStages.DrawCardStageEnd
    );
  }

  public async beforeUse(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    const targets = room.getOtherPlayers(event.fromId).filter(
      (player) =>
        (player.getEquipment(CardType.Shield) ||
          player
            .getPlayerSkills(undefined, true)
            .filter((skill) => !skill.isShadowSkill()).length >
            room
              .getPlayerById(event.fromId)
              .getPlayerSkills(undefined, true)
              .filter((skill) => !skill.isShadowSkill()).length ||
          player.LostHp === 0) &&
        room.canUseCardTo(
          new CardMatcher({ generalName: ["slash"] }),
          room.getPlayerById(event.fromId),
          player,
          true
        )
    );

    if (targets.length > 0) {
      const response =
        await room.doAskForCommonly<GameEventIdentifiers.AskForChoosingPlayerEvent>(
          GameEventIdentifiers.AskForChoosingPlayerEvent,
          {
            players: targets.map((player) => player.Id),
            toId: event.fromId,
            requiredAmount: 1,
            conversation: "jixian: do you want to use a slash?",
            triggeredBySkills: [this.Name],
          },
          event.fromId
        );

      if (response.selectedPlayers && response.selectedPlayers.length > 0) {
        event.toIds = response.selectedPlayers;
        return true;
      }
    }

    return false;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    if (!event.toIds) {
      return false;
    }

    let drawNum = 0;
    const to = room.getPlayerById(event.toIds[0]);
    to.getEquipment(CardType.Shield) && drawNum++;
    to
      .getPlayerSkills(undefined, true)
      .filter((skill) => !skill.isShadowSkill()).length >
      room
        .getPlayerById(event.fromId)
        .getPlayerSkills(undefined, true)
        .filter((skill) => !skill.isShadowSkill()).length && drawNum++;
    to.LostHp === 0 && drawNum++;

    await room.useCard({
      fromId: event.fromId,
      targetGroup: [event.toIds],
      cardId: VirtualCard.create({ cardName: "slash", bySkill: this.Name }).Id,
      extraUse: true,
      triggeredBySkills: [this.Name],
    });

    await room.drawCards(drawNum, event.fromId, "top", event.fromId, this.Name);

    return true;
  }
}

@ShadowSkill
@PersistentSkill()
@CommonSkill({
  name: ZhuLingJiXian.Name,
  description: ZhuLingJiXian.Description,
})
export class ZhuLingJiXianShadow
  extends TriggerSkill
  implements OnDefineReleaseTiming
{
  public afterLosingSkill(
    room: Room,
    owner: PlayerId,
    content: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return (
      room.CurrentPlayerPhase === PlayerPhase.PhaseBegin &&
      stage === PhaseChangeStage.BeforePhaseChange
    );
  }

  public isAutoTrigger(): boolean {
    return true;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === CardUseStage.CardUseFinishedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): boolean {
    return (
      content.fromId === owner.Id &&
      Sanguosha.getCardById(content.cardId).isVirtualCard() &&
      Sanguosha.getCardById<VirtualCard>(content.cardId).findByGeneratedSkill(
        this.GeneralName
      ) &&
      !EventPacker.getDamageSignatureInCardUse(content)
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.loseHp(event.fromId, 1);

    return true;
  }
}
