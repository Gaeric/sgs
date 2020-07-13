import { CardSuit } from 'core/cards/libs/card_props';
import { CharacterNationality } from 'core/characters/character';
import { GameEventIdentifiers, ServerEventFinder } from 'core/event/event';
import { Sanguosha } from 'core/game/engine';
import { AllStage, DamageEffectStage } from 'core/game/stage_processor';
import { Player } from 'core/player/player';
import { Room } from 'core/room/room';
import { TriggerSkill } from 'core/skills/skill';
import { CommonSkill, LordSkill } from 'core/skills/skill_wrappers';
import { TranslationPack } from 'core/translations/translation_json_tool';

@LordSkill
@CommonSkill({ name: 'baonve', description: 'baonve_description' })
export class BaoNve extends TriggerSkill {
  public isAutoTrigger() {
    return true;
  }

  public isTriggerable(event: ServerEventFinder<GameEventIdentifiers.DamageEvent>, stage: AllStage): boolean {
    return stage === DamageEffectStage.AfterDamageEffect;
  }

  public canUse(room: Room, owner: Player, event: ServerEventFinder<GameEventIdentifiers.DamageEvent>): boolean {
    const { fromId } = event;
    if (fromId === undefined || room.getPlayerById(fromId).Dead) {
      return false;
    }

    return (
      owner.Id !== fromId &&
      room.getPlayerById(fromId).Nationality === CharacterNationality.Qun
    );
  }

  public async onTrigger(room: Room, content: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>): Promise<boolean> {
    content.translationsMessage = undefined;

    return true;
  }

  public async onEffect(room: Room, event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>): Promise<boolean> {
    const { triggeredOnEvent } = event;
    const { fromId } = triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;

    if (fromId === undefined) {
      return false;
    }

    const askForInvokeSkill: ServerEventFinder<GameEventIdentifiers.AskForChoosingOptionsEvent> = {
      toId: fromId,
      options: ['yes', 'no'],
      conversation: TranslationPack.translationJsonPatcher(
        '{0}: do you want {1} to start a judge?',
        this.Name,
        TranslationPack.patchPlayerInTranslation(room.getPlayerById(event.fromId))
      ).extract(),
    };

    room.notify(GameEventIdentifiers.AskForChoosingOptionsEvent, askForInvokeSkill, fromId);
    const { selectedOption } = await room.onReceivingAsyncResponseFrom(
      GameEventIdentifiers.AskForChoosingOptionsEvent,
      fromId
    );

    if (selectedOption === 'yes') {
      room.broadcast(GameEventIdentifiers.CustomGameDialog, {
        translationsMessage: TranslationPack.translationJsonPatcher(
          '{0} used skill {1}',
          TranslationPack.patchPlayerInTranslation(room.getPlayerById(fromId)),
          this.Name,
        ).extract(),
      });

      const judge = await room.judge(event.fromId, undefined, this.Name);

      if (Sanguosha.getCardById(judge.judgeCardId).Suit === CardSuit.Spade) {
        room.recover({
          toId: event.fromId,
          recoveredHp: 1,
          recoverBy: event.fromId,
        });
      }
    }

    return true;
  }
}