import { CardSuit } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage, PlayerPhase } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AimGroupUtil } from "../../../shares/libs/utils/aim_group";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "fengpo", description: "fengpo_description" })
export class FengPo extends TriggerSkill {
  private readonly FengPoOptions = ["fengpo:draw", "fengpo:damage"];

  public isAutoTrigger(): boolean {
    return true;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ): boolean {
    return stage === AimStage.AfterAim;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    return (
      content.fromId === owner.Id &&
      room.CurrentPlayerPhase === PlayerPhase.PlayCardStage &&
      room.CurrentPhasePlayer === owner &&
      AimGroupUtil.getAllTargets(content.allTargets).length === 1 &&
      room.getPlayerById(content.toId).getCardIds(PlayerCardsArea.HandArea)
        .length > 0 &&
      (Sanguosha.getCardById(content.byCardId).GeneralName === "slash" ||
        Sanguosha.getCardById(content.byCardId).GeneralName === "duel") &&
      room.Analytics.getRecordEvents<GameEventIdentifiers.CardUseEvent>(
        (event) =>
          EventPacker.getIdentifier(event) ===
            GameEventIdentifiers.CardUseEvent &&
          event.fromId === owner.Id &&
          (Sanguosha.getCardById(event.cardId).GeneralName === "slash" ||
            Sanguosha.getCardById(event.cardId).GeneralName === "duel"),
        owner.Id,
        "phase",
        undefined,
        2
      ).length === 1
    );
  }

  public async beforeUse(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    const response =
      await room.doAskForCommonly<GameEventIdentifiers.AskForChoosingOptionsEvent>(
        GameEventIdentifiers.AskForChoosingOptionsEvent,
        {
          options: this.FengPoOptions,
          conversation: TranslationPack.translationJsonPatcher(
            "{0}: please choose fengpo options: {1} {2}",
            this.Name,
            TranslationPack.patchCardInTranslation(
              (
                event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>
              ).byCardId
            ),
            TranslationPack.patchPlayerInTranslation(
              room.getPlayerById(
                (
                  event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>
                ).toId
              )
            )
          ).extract(),
          toId: event.fromId,
          triggeredBySkills: [this.Name],
        },
        event.fromId
      );

    if (response.selectedOption) {
      EventPacker.addMiddleware(
        { tag: this.Name, data: response.selectedOption },
        event
      );
      return true;
    }

    return false;
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { fromId } = event;
    const chosen = EventPacker.getMiddleware<string>(this.Name, event);
    const diamonds = room
      .getPlayerById(
        (
          event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>
        ).toId
      )
      .getCardIds(PlayerCardsArea.HandArea)
      .filter(
        (id) => Sanguosha.getCardById(id).Suit === CardSuit.Diamond
      ).length;

    if (diamonds) {
      if (chosen === this.FengPoOptions[0]) {
        await room.drawCards(diamonds, fromId, "top", fromId, this.Name);
      } else {
        const aimEvent =
          event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
        aimEvent.additionalDamage = aimEvent.additionalDamage || 0;
        aimEvent.additionalDamage += diamonds;
      }
    }

    return true;
  }
}
