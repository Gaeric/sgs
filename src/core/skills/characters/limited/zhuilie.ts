import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { INFINITE_DISTANCE } from "../../../game/game_props";
import {
  AimStage,
  AllStage,
  PhaseChangeStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import {
  JudgeMatcher,
  JudgeMatcherEnum,
} from "../../../shares/libs/judge_matchers";
import { TagEnum } from "../../../shares/types/tag_list";
import {
  OnDefineReleaseTiming,
  RulesBreakerSkill,
  TriggerSkill,
} from "../../skill";
import {
  CompulsorySkill,
  PersistentSkill,
  ShadowSkill,
} from "../../skill_wrappers";

@CompulsorySkill({ name: "zhuilie", description: "zhuilie_description" })
export class ZhuiLie extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ): boolean {
    return stage === AimStage.AfterAimmed;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    return (
      content.fromId === owner.Id &&
      !content.extraUse &&
      Sanguosha.getCardById(content.byCardId).GeneralName === "slash" &&
      !room.withinAttackDistance(owner, room.getPlayerById(content.toId))
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const aimEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
    aimEvent.extraUse = true;

    room.CurrentPlayerPhase === PlayerPhase.PlayCardStage &&
      room.CurrentPhasePlayer === room.getPlayerById(event.fromId) &&
      room.syncGameCommonRules(event.fromId, (user) => {
        room.CommonRules.addCardUsableTimes(
          new CardMatcher({ generalName: ["slash"] }),
          1,
          user
        );
        user.addInvisibleMark(this.Name, 1);
      });

    const judgeEvent = await room.judge(
      event.fromId,
      undefined,
      this.Name,
      JudgeMatcherEnum.ZhuiLie
    );
    if (
      JudgeMatcher.onJudge(
        judgeEvent.judgeMatcherEnum!,
        Sanguosha.getCardById(judgeEvent.judgeCardId)
      )
    ) {
      aimEvent.additionalDamage =
        room.getPlayerById(aimEvent.toId).Hp -
        1 -
        (EventPacker.getMiddleware<number>(TagEnum.DrunkTag, aimEvent) || 0);
    } else {
      await room.loseHp(event.fromId, 1);
    }

    return true;
  }
}

@ShadowSkill
@CompulsorySkill({ name: ZhuiLie.Name, description: ZhuiLie.Description })
export class ZhuiLieShadow extends RulesBreakerSkill {
  public breakCardUsableDistance(
    cardId: CardId | CardMatcher,
    room: Room,
    owner: Player
  ): number {
    let match = false;
    if (cardId instanceof CardMatcher) {
      match = cardId.match(new CardMatcher({ generalName: ["slash"] }));
    } else {
      match = Sanguosha.getCardById(cardId).GeneralName === "slash";
    }

    if (match) {
      return INFINITE_DISTANCE;
    } else {
      return 0;
    }
  }
}

@ShadowSkill
@PersistentSkill()
@CompulsorySkill({
  name: ZhuiLieShadow.Name,
  description: ZhuiLieShadow.Description,
})
export class ZhuiLieClear
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
      room.CurrentPlayerPhase === PlayerPhase.PlayCardStage &&
      stage === PhaseChangeStage.PhaseChanged
    );
  }

  private clearZhuiLieHistory(room: Room, from: Player) {
    const extraUse = from.getInvisibleMark(this.GeneralName);
    if (extraUse === 0) {
      return;
    }

    room.syncGameCommonRules(from.Id, (user) => {
      room.CommonRules.addCardUsableTimes(
        new CardMatcher({ generalName: ["slash"] }),
        -extraUse,
        user
      );
      from.removeInvisibleMark(this.GeneralName);
    });
  }

  public async whenDead(room: Room, player: Player) {
    this.clearZhuiLieHistory(room, player);
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseChangeStage.PhaseChanged;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>
  ): boolean {
    return (
      content.fromPlayer === owner.Id &&
      content.from === PlayerPhase.PlayCardStage &&
      owner.getInvisibleMark(this.GeneralName) > 0
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    this.clearZhuiLieHistory(room, room.getPlayerById(event.fromId));

    return true;
  }
}
