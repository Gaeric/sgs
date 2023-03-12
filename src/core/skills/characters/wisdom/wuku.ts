import { CardType } from "../../../cards/card";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardUseStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import {
  CompulsorySkill,
  OnDefineReleaseTiming,
  TriggerSkill,
} from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CompulsorySkill({ name: "wuku", description: "wuku_description" })
export class WuKu extends TriggerSkill implements OnDefineReleaseTiming {
  public async whenLosingSkill(room: Room, owner: Player) {
    room.removeFlag(owner.Id, this.Name);
  }

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
    const wuku = owner.getFlag<number>(this.Name) || 0;
    return Sanguosha.getCardById(content.cardId).is(CardType.Equip) && wuku < 3;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const wuku = room.getFlag<number>(event.fromId, this.Name) || 0;
    room.setFlag<number>(
      event.fromId,
      this.Name,
      wuku + 1,
      TranslationPack.translationJsonPatcher("wuku: {0}", wuku + 1).toString()
    );

    return true;
  }
}
