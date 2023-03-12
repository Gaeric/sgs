import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseChangeStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { AwakeningSkill } from "../../skill_wrappers";
import { ShenWei } from "./shenwei";
import { WuShuang } from "../standard/wushuang";

@AwakeningSkill({ name: "zhuangrong", description: "zhuangrong_description" })
export class ZhuangRong extends TriggerSkill {
  public get RelatedSkills(): string[] {
    return [ShenWei.Name, WuShuang.Name];
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
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
      content.from === PlayerPhase.PhaseFinish &&
      room.enableToAwaken(this.Name, owner)
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.changeMaxHp(event.fromId, -1);

    const from = room.getPlayerById(event.fromId);
    await room.recover({
      toId: event.fromId,
      recoveredHp: from.MaxHp - from.Hp,
      recoverBy: event.fromId,
    });

    const diff = from.MaxHp - from.getCardIds(PlayerCardsArea.HandArea).length;
    diff &&
      (await room.drawCards(
        diff,
        event.fromId,
        "top",
        event.fromId,
        this.Name
      ));

    for (const skillName of this.RelatedSkills) {
      await room.obtainSkill(event.fromId, skillName);
    }

    return true;
  }
}
