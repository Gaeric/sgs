import { WuXieKeJiSkillTrigger } from "../../../ai/skills/cards/wuxiekeji";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Room } from "../../../room/room";
import { System } from "../../../shares/libs/system";
import { AI, CommonSkill, ResponsiveSkill } from "../../skill";

@AI(WuXieKeJiSkillTrigger)
@CommonSkill({ name: "wuxiekeji", description: "wuxiekeji_description" })
export class WuXieKeJiSkill extends ResponsiveSkill {
  public responsiveFor() {
    return new CardMatcher({
      name: ["wuxiekeji"],
    });
  }

  async onUse(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ) {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>
  ) {
    const { responseToEvent, toCardIds } = event;

    if (
      !responseToEvent ||
      !toCardIds ||
      EventPacker.getIdentifier(responseToEvent) !==
        GameEventIdentifiers.CardEffectEvent
    ) {
      return false;
    }

    (
      responseToEvent as ServerEventFinder<GameEventIdentifiers.CardEffectEvent>
    ).isCancelledOut = true;

    room.doNotify(
      room.AlivePlayers.map((player) => player.Id),
      1500
    );
    await System.MainThread.sleep(1500);

    return true;
  }
}
