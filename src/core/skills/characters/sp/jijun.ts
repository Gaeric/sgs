import { CardType } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMovedBySpecifiedReason,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage, CardMoveStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AimGroupUtil } from "../../../shares/libs/utils/aim_group";
import { TriggerSkill } from "../../skill";
import {
  CommonSkill,
  PersistentSkill,
  ShadowSkill,
} from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "jijun", description: "jijun_description" })
export class JiJun extends TriggerSkill {
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
    const card = Sanguosha.getCardById(content.byCardId);
    return (
      content.isFirstTarget &&
      content.fromId === owner.Id &&
      (card.is(CardType.Weapon) || !card.is(CardType.Equip)) &&
      AimGroupUtil.getAllTargets(content.allTargets).includes(owner.Id)
    );
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { fromId } = event;
    await room.judge(fromId, undefined, this.Name);

    return true;
  }
}

@ShadowSkill
@PersistentSkill()
@CommonSkill({ name: JiJun.Name, description: JiJun.Description })
export class JiJunShadow extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardMoveStage.AfterCardMoved;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ): boolean {
    return (
      content.infos.find(
        (info) =>
          info.proposer === owner.Id &&
          info.movedByReason === CardMovedBySpecifiedReason.JudgeProcess &&
          info.toArea === CardMoveArea.DropStack &&
          info.triggeredBySkills?.includes(this.GeneralName) &&
          info.movingCards.find((card) => room.isCardInDropStack(card.card))
      ) !== undefined
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ): PatchedTranslationObject {
    const judgeCardIds: CardId[] = [];

    for (const info of event.infos) {
      if (
        info.proposer === owner.Id &&
        info.movedByReason === CardMovedBySpecifiedReason.JudgeProcess &&
        info.toArea === CardMoveArea.DropStack &&
        info.triggeredBySkills?.includes(this.GeneralName)
      ) {
        judgeCardIds.push(
          ...info.movingCards
            .filter((card) => room.isCardInDropStack(card.card))
            .map((card) => card.card)
        );
      }
    }

    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to put {1} on your general as ‘Jun’?",
      this.GeneralName,
      TranslationPack.patchCardInTranslation(...judgeCardIds)
    ).extract();
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { fromId } = event;
    const judgeCardIds: CardId[] = [];

    for (const info of (
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
    ).infos) {
      if (
        info.proposer === fromId &&
        info.movedByReason === CardMovedBySpecifiedReason.JudgeProcess &&
        info.toArea === CardMoveArea.DropStack &&
        info.triggeredBySkills?.includes(this.GeneralName)
      ) {
        judgeCardIds.push(
          ...info.movingCards
            .filter((card) => room.isCardInDropStack(card.card))
            .map((card) => card.card)
        );
      }
    }

    await room.moveCards({
      movingCards: judgeCardIds.map((card) => ({
        card,
        fromArea: CardMoveArea.DropStack,
      })),
      toId: fromId,
      toArea: PlayerCardsArea.OutsideArea,
      moveReason: CardMoveReason.ActiveMove,
      toOutsideArea: this.GeneralName,
      isOutsideAreaInPublic: true,
      proposer: fromId,
      movedByReason: this.GeneralName,
    });

    return true;
  }
}
