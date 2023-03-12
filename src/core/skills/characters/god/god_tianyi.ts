import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { AwakeningSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@AwakeningSkill({ name: "god_tianyi", description: "god_tianyi_description" })
export class GodTianYi extends TriggerSkill {
  public get RelatedSkills(): string[] {
    return ["zuoxing"];
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PhaseStageChangeStage.StageChanged &&
      event.toStage === PlayerPhaseStages.PrepareStageStart
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      content.playerId === owner.Id && room.enableToAwaken(this.Name, owner)
    );
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
    await room.changeMaxHp(fromId, 2);
    await room.recover({
      toId: fromId,
      recoveredHp: 1,
      recoverBy: fromId,
    });

    const players = room.getAlivePlayersFrom().map((player) => player.Id);
    const resp =
      await room.doAskForCommonly<GameEventIdentifiers.AskForChoosingPlayerEvent>(
        GameEventIdentifiers.AskForChoosingPlayerEvent,
        {
          players,
          toId: fromId,
          requiredAmount: 1,
          conversation:
            "god_tianyi:please choose a target to obtain ‘Zuo Xing’",
          triggeredBySkills: [this.Name],
        },
        fromId,
        true
      );

    resp.selectedPlayers = resp.selectedPlayers || [
      players[Math.floor(Math.random() * players.length)],
    ];

    await room.obtainSkill(resp.selectedPlayers[0], "zuoxing");

    return true;
  }
}
