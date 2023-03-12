import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, PlayerDyingStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TiaoXin } from "../..";
import { TriggerSkill } from "../../skill";
import { AwakeningSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";
import { KunFen, KunFenEX } from "./kunfen";

@AwakeningSkill({ name: "fengliang", description: "fengliang_description" })
export class FengLiang extends TriggerSkill {
  public get RelatedSkills(): string[] {
    return ["tiaoxin"];
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PlayerDyingStage.PlayerDying;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>
  ): boolean {
    return content.dying === owner.Id && owner.Hp < 1;
  }

  public async onTrigger(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    skillUseEvent.translationsMessage = TranslationPack.translationJsonPatcher(
      "{0} activated awakening skill {1}",
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(skillUseEvent.fromId)
      ),
      this.Name
    ).extract();

    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    await room.changeMaxHp(fromId, -1);
    await room.recover({
      toId: fromId,
      recoveredHp: 2 - room.getPlayerById(fromId).Hp,
      recoverBy: fromId,
    });

    await room.obtainSkill(fromId, TiaoXin.Name, true);
    await room.updateSkill(fromId, KunFen.Name, KunFenEX.Name);

    return true;
  }
}
