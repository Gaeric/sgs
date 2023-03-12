import { VirtualCard } from "../../../cards/card";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "shuimeng", description: "shuimeng_description" })
export class ShuiMeng extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
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
      content.toStage === PlayerPhaseStages.PlayCardStageEnd &&
      owner.getCardIds(PlayerCardsArea.HandArea).length > 0
    );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return room.canPindian(owner, target);
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose a target to pindian?",
      this.Name
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
    if (!event.toIds) {
      return false;
    }

    const pindianEvent = await room.pindian(fromId, event.toIds, this.Name);
    if (pindianEvent.pindianRecord[0].winner === fromId) {
      const from = room.getPlayerById(fromId);
      const virtualWuZhong = VirtualCard.create({
        cardName: "wuzhongshengyou",
        bySkill: this.Name,
      }).Id;
      room.canUseCardTo(virtualWuZhong, from, from) &&
        (await room.useCard({
          fromId,
          cardId: virtualWuZhong,
        }));
    } else {
      const virtualGuoHe = VirtualCard.create({
        cardName: "guohechaiqiao",
        bySkill: this.Name,
      }).Id;
      room
        .getPlayerById(event.toIds[0])
        .canUseCardTo(room, virtualGuoHe, fromId) &&
        (await room.useCard({
          fromId: event.toIds[0],
          targetGroup: [[fromId]],
          cardId: virtualGuoHe,
        }));
    }

    return true;
  }
}
