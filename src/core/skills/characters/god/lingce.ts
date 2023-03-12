import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardUseStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";
import { DingHan } from "./dinghan";

@CompulsorySkill({ name: "lingce", description: "lingce_description" })
export class LingCe extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardUseStage.CardUsing;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): boolean {
    const card = Sanguosha.getCardById(content.cardId);
    return (
      !card.isVirtualCard() &&
      (card.isWisdomCard() ||
        card.Name === "qizhengxiangsheng" ||
        (owner.getFlag<string[]>(DingHan.Name) &&
          owner.getFlag<string[]>(DingHan.Name).includes(card.Name)))
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.drawCards(1, event.fromId, "top", event.fromId, this.Name);

    return true;
  }
}
