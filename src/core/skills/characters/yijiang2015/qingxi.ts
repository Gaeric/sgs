import { CardType } from "../../../cards/card";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import {
  JudgeMatcher,
  JudgeMatcherEnum,
} from "../../../shares/libs/judge_matchers";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "qingxi", description: "qingxi_description" })
export class QingXi extends TriggerSkill {
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
      (Sanguosha.getCardById(content.byCardId).GeneralName === "slash" ||
        Sanguosha.getCardById(content.byCardId).GeneralName === "duel")
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to use this skill to {1} ?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(room.getPlayerById(content.toId))
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    const aimEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;

    const weapon = room.getPlayerById(fromId).getEquipment(CardType.Weapon);
    const withinAttackRange = Math.min(
      room
        .getOtherPlayers(fromId)
        .filter((player) =>
          room.withinAttackDistance(room.getPlayerById(fromId), player)
        ).length,
      weapon ? 4 : 2
    );
    let option2 = true;
    if (
      withinAttackRange > 0 &&
      room.getPlayerById(aimEvent.toId).getCardIds(PlayerCardsArea.HandArea)
        .length > 0
    ) {
      const response = await room.askForCardDrop(
        aimEvent.toId,
        withinAttackRange,
        [PlayerCardsArea.HandArea],
        false,
        undefined,
        this.Name,
        TranslationPack.translationJsonPatcher(
          "{0}: please drop {1} card(s), or {2} will deal 1 more damage to you",
          this.Name,
          withinAttackRange,
          TranslationPack.patchCardInTranslation(aimEvent.byCardId)
        ).extract()
      );

      if (response.droppedCards.length > 0) {
        option2 = false;
        await room.dropCards(
          CardMoveReason.SelfDrop,
          response.droppedCards,
          aimEvent.toId,
          aimEvent.toId,
          this.Name
        );

        weapon &&
          (await room.dropCards(
            CardMoveReason.PassiveDrop,
            [weapon],
            fromId,
            aimEvent.toId,
            this.Name
          ));
      }
    }

    if (option2) {
      aimEvent.additionalDamage = aimEvent.additionalDamage || 0;
      aimEvent.additionalDamage++;

      const judgeEvent = await room.judge(
        fromId,
        undefined,
        this.Name,
        JudgeMatcherEnum.QingXi
      );
      if (
        JudgeMatcher.onJudge(
          judgeEvent.judgeMatcherEnum!,
          Sanguosha.getCardById(judgeEvent.judgeCardId)
        )
      ) {
        EventPacker.setDisresponsiveEvent(aimEvent);
      }
    }

    return true;
  }
}
