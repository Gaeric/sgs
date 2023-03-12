import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import {
  AllStage,
  PhaseChangeStage,
  PhaseStageChangeStage,
  PlayerPhase,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import {
  ActiveSkill,
  OnDefineReleaseTiming,
  TriggerSkill,
} from "../../skill";
import {
  CommonSkill,
  PersistentSkill,
  ShadowSkill,
} from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "xin_yinju", description: "xin_yinju_description" })
export class XinYinJu extends ActiveSkill {
  public canUse(room: Room, owner: Player): boolean {
    return !owner.hasUsedSkill(this.Name);
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return target !== owner;
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 0;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return false;
  }

  public async onUse(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    if (!event.toIds) {
      return false;
    }

    const toId = event.toIds[0];
    const response = await room.askForCardUse(
      {
        toId,
        cardUserId: toId,
        scopedTargets: [event.fromId],
        cardMatcher: new CardMatcher({
          generalName: ["slash"],
        }).toSocketPassenger(),
        extraUse: true,
        conversation: TranslationPack.translationJsonPatcher(
          "{0}: please use a slash to {1} , or you will skip your next play card phase and drop card phase",
          this.Name,
          TranslationPack.patchPlayerInTranslation(
            room.getPlayerById(event.fromId)
          )
        ).extract(),
        triggeredBySkills: [this.Name],
      },
      toId
    );

    if (response.cardId !== undefined) {
      const slashUseEvent: ServerEventFinder<GameEventIdentifiers.CardUseEvent> =
        {
          fromId: response.fromId,
          targetGroup: response.toIds && [response.toIds],
          cardId: response.cardId,
          triggeredBySkills: [this.Name],
        };

      await room.useCard(slashUseEvent, true);
    } else {
      room.setFlag<boolean>(toId, this.Name, true, this.Name);
      room.getPlayerById(toId).hasShadowSkill(XinYinJuDebuff.Name) ||
        (await room.obtainSkill(toId, XinYinJuDebuff.Name));
    }

    return true;
  }
}

@ShadowSkill
@PersistentSkill()
@CommonSkill({
  name: "s_xin_yinju_debuff",
  description: "s_xin_yinju_debuff_description",
})
export class XinYinJuDebuff
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
      room.CurrentPlayer === room.getPlayerById(owner) &&
      room.CurrentPlayerPhase === PlayerPhase.PhaseFinish &&
      stage === PhaseChangeStage.PhaseChanged
    );
  }

  public isAutoTrigger(): boolean {
    return true;
  }

  public isFlaggedSkill(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ) {
    return stage === PhaseChangeStage.PhaseChanged;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PhaseStageChangeStage.StageChanged ||
      stage === PhaseChangeStage.PhaseChanged
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<
      | GameEventIdentifiers.PhaseStageChangeEvent
      | GameEventIdentifiers.PhaseChangeEvent
    >,
    stage?: AllStage
  ): boolean {
    const identifier = EventPacker.getIdentifier(event);
    if (identifier === GameEventIdentifiers.PhaseStageChangeEvent) {
      const phaseStageChangeEvent =
        event as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>;
      return (
        phaseStageChangeEvent.playerId === owner.Id &&
        phaseStageChangeEvent.toStage === PlayerPhaseStages.PrepareStageStart &&
        owner.getFlag<boolean>(XinYinJu.Name) !== undefined
      );
    } else if (identifier === GameEventIdentifiers.PhaseChangeEvent) {
      const phaseChangeEvent =
        event as ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>;
      return (
        phaseChangeEvent.fromPlayer === owner.Id &&
        phaseChangeEvent.from === PlayerPhase.PhaseFinish
      );
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
    const unknownEvent = event.triggeredOnEvent as ServerEventFinder<
      | GameEventIdentifiers.PhaseStageChangeEvent
      | GameEventIdentifiers.PhaseChangeEvent
    >;

    const identifier = EventPacker.getIdentifier(unknownEvent);
    if (identifier === GameEventIdentifiers.PhaseStageChangeEvent) {
      await room.skip(event.fromId, PlayerPhase.PlayCardStage);
      await room.skip(event.fromId, PlayerPhase.DropCardStage);
    }

    room.removeFlag(event.fromId, XinYinJu.Name);
    await room.loseSkill(event.fromId, this.Name);

    return true;
  }
}
