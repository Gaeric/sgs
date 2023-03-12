import {
  EventPicker,
  GameEventIdentifiers,
  WorkPlace,
} from "../../event/event";
// import { compress, decompress } from "../../shares/libs/utils/shrink_string";

export class RoomEventStacker<T extends WorkPlace> {
  private eventStack: EventPicker<GameEventIdentifiers, T>[] = [];
  push(content: EventPicker<GameEventIdentifiers, T>) {
    this.eventStack.push(content);
  }

  async toString(): Promise<string> {
    // return await compress(JSON.stringify(this.eventStack));
    return JSON.stringify(this.eventStack);
  }

  static async toString(
    eventStack: EventPicker<GameEventIdentifiers, WorkPlace>[]
  ): Promise<string> {
    // return await compress(JSON.stringify(eventStack));
    return JSON.stringify(eventStack);
  }

  static async toStack(eventsString: string) {
    // return JSON.parse(await decompress(eventsString));
    return JSON.parse(eventsString);
  }
}
