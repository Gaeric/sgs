import { CharacterNationality } from "../../../characters/character";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { DamageType } from "../../../game/game_props";
import { AllStage, PlayerDyingStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { OnDefineReleaseTiming } from "../../skill_hooks";
import {
  CommonSkill,
  LimitSkill,
  LordSkill,
  PersistentSkill,
  ShadowSkill,
} from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@LordSkill
@LimitSkill({ name: "xingshuai", description: "xingshuai_description" })
export class XingShuai extends TriggerSkill {
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
    return (
      content.dying === owner.Id &&
      owner.Hp <= 0 &&
      room
        .getOtherPlayers(owner.Id)
        .find((player) => player.Nationality === CharacterNationality.Wei) !==
        undefined
    );
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to let other Wei generals to choose whether let you recover 1 hp?",
      this.Name
    ).extract();
  }

  public async onTrigger(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    event.animation = [
      {
        from: event.fromId,
        tos: room
          .getOtherPlayers(event.fromId)
          .filter((player) => player.Nationality === CharacterNationality.Wei)
          .map((player) => player.Id),
      },
    ];

    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    for (const other of room
      .getOtherPlayers(fromId)
      .filter((player) => player.Nationality === CharacterNationality.Wei)) {
      const { selectedOption } =
        await room.doAskForCommonly<GameEventIdentifiers.AskForChoosingOptionsEvent>(
          GameEventIdentifiers.AskForChoosingOptionsEvent,
          {
            toId: other.Id,
            options: ["yes", "no"],
            conversation: TranslationPack.translationJsonPatcher(
              "{0}: do you want to let {1} recover 1 hp, then you will take 1 damage?",
              this.Name,
              TranslationPack.patchPlayerInTranslation(
                room.getPlayerById(fromId)
              )
            ).extract(),
          },
          other.Id,
          true
        );

      if (selectedOption === "yes") {
        const originalPlayers =
          room.getFlag<PlayerId[]>(fromId, this.Name) || [];
        originalPlayers.push(other.Id);
        room
          .getPlayerById(fromId)
          .setFlag<PlayerId[]>(this.Name, originalPlayers);

        EventPacker.addMiddleware(
          { tag: this.GeneralName, data: true },
          event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>
        );

        await room.recover({
          toId: fromId,
          recoveredHp: 1,
          recoverBy: other.Id,
        });
      }
    }

    return true;
  }
}

@ShadowSkill
@PersistentSkill()
@CommonSkill({ name: XingShuai.Name, description: XingShuai.Description })
export class XingShuaiShadow
  extends TriggerSkill
  implements OnDefineReleaseTiming
{
  public afterLosingSkill(
    room: Room,
    owner: PlayerId,
    content: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PlayerDyingStage.AfterPlayerDying &&
      EventPacker.getMiddleware<boolean>(this.GeneralName, content) === true
    );
  }

  public afterDead(
    room: Room,
    owner: PlayerId,
    content: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PlayerDyingStage.AfterPlayerDying &&
      EventPacker.getMiddleware<boolean>(this.GeneralName, content) === true
    );
  }

  public isAutoTrigger(): boolean {
    return true;
  }

  public isFlaggedSkill(): boolean {
    return true;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PlayerDyingStage.AfterPlayerDying;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>
  ): boolean {
    return (
      content.dying === owner.Id &&
      EventPacker.getMiddleware(this.GeneralName, content) === true
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const players = room.getFlag<PlayerId[]>(event.fromId, this.GeneralName);
    room.sortPlayersByPosition(players);

    for (const player of players) {
      await room.damage({
        toId: player,
        damage: 1,
        damageType: DamageType.Normal,
        triggeredBySkills: [this.Name],
      });
    }

    return true;
  }
}
