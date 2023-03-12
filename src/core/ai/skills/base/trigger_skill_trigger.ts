import type { TriggerSkillTrigger } from "../../ai_skill_trigger";
import type { CardId } from "../../../cards/libs/card_props";
import type {
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import type { TriggerSkill } from "../../../skills/skill";
import { BaseSkillTrigger } from "./base_trigger";

export class TriggerSkillTriggerClass<
  T extends TriggerSkill = TriggerSkill,
  I extends GameEventIdentifiers = GameEventIdentifiers
> extends BaseSkillTrigger {
  public readonly skillTrigger: TriggerSkillTrigger<T, I> = (
    room: Room,
    ai: Player,
    skill: TriggerSkill,
    onEvent?: ServerEventFinder<I>,
    skillInCard?: CardId
  ) => undefined;
}
