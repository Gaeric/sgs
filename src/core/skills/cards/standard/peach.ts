import { PeachSkillTrigger } from "../../../ai/skills/cards/peach";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { Precondition } from "../../../shares/libs/precondition/precondition";
import {
  ActiveSkill,
  AI,
  CommonSkill,
  SelfTargetSkill,
} from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";
import { ExtralCardSkillProperty } from "../interface/extral_property";

@AI(PeachSkillTrigger)
@CommonSkill({ name: "peach", description: "peach_skill_description" })
@SelfTargetSkill
export class PeachSkill extends ActiveSkill implements ExtralCardSkillProperty {
  canUse(room: Room, owner: Player) {
    return owner.Hp < owner.MaxHp;
  }

  cardFilter(room: Room, owner: Player, cards: CardId[]) {
    return cards.length === 0;
  }

  public numberOfTargets() {
    return 0;
  }

  isAvailableCard() {
    return false;
  }

  isCardAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    const player = room.getPlayerById(target);
    return owner !== target && player.Hp < player.MaxHp;
  }

  isAvailableTarget() {
    return false;
  }

  async onUse(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ) {
    if (!event.targetGroup) {
      event.targetGroup = [[event.fromId]];
    }

    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>
  ) {
    const toId = Precondition.exists(
      event.toIds,
      "Unknown targets in peach"
    )[0];
    const recoverContent = {
      recoverBy: event.fromId,
      toId,
      recoveredHp: 1 + (event.additionalRecoveredHp || 0),
      cardIds: [event.cardId],
      triggeredBySkills: [this.Name],
      translationsMessage: TranslationPack.translationJsonPatcher(
        "{0} recovers {1} hp",
        room.getPlayerById(toId).Name,
        "1"
      ).extract(),
    };

    await room.recover(recoverContent);

    return true;
  }
}
