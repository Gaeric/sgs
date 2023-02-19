import { CardSuit } from 'core/cards/libs/card_props';
import { GameEventIdentifiers, ServerEventFinder } from 'core/event/event';
import { AllStage, PhaseStageChangeStage, PlayerPhaseStages } from 'core/game/stage_processor';
import { Player } from 'core/player/player';
import { Room } from 'core/room/room';
import { CircleSkill, CommonSkill, TriggerSkill } from 'core/skills/skill';

@CircleSkill
@CommonSkill({ name: 'botu', description: 'botu_description' })
export class BoTu extends TriggerSkill {
  isTriggerable(event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>, stage?: AllStage) {
    return stage === PhaseStageChangeStage.AfterStageChanged;
  }

  canUse(room: Room, owner: Player, content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>) {
    if (
      content.toStage === PlayerPhaseStages.FinishStageStart &&
      owner.hasUsedSkillTimes(this.Name) < Math.min(room.AlivePlayers.length, 3)
    ) {
      const cards = room.getRoundDropCards();
      const cardSuits = cards.reduce<CardSuit[]>((allSuits, card) => {
        if (!allSuits.includes(card.Suit) && card.Suit !== CardSuit.NoSuit) {
          allSuits.push(card.Suit);
        }

        return allSuits;
      }, []);

      return cardSuits.length === 4;
    }

    return false;
  }

  async onTrigger() {
    return true;
  }

  async onEffect(room: Room, skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>) {
    room.insertPlayerRound(skillUseEvent.fromId);
    return true;
  }
}
