import { RoomMode } from 'core/shares/types/room_props';
import type { PageRoutingProps } from 'types/page_props';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHostConfig(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.host === 'string' &&
    value.host.length > 0 &&
    (value.protocol === 'http' || value.protocol === 'https') &&
    typeof value.port === 'number' &&
    Number.isInteger(value.port) &&
    value.port > 0 &&
    value.port <= 65535 &&
    typeof value.hostTag === 'string'
  );
}

function isRoomId(slug: string | undefined): boolean {
  return slug !== undefined && /^\d+$/.test(slug) && Number.isSafeInteger(Number(slug));
}

// Memory routing state is process-local. Direct or incomplete navigation should
// return to the lobby rather than entering constructors that require a host.
export function isWaitingRoomRoute({ params, location }: PageRoutingProps): boolean {
  return isRoomId(params.slug) && isRecord(location.state) && isHostConfig(location.state.hostConfig);
}

export function isGameRoomRoute({ params, location }: PageRoutingProps): boolean {
  const state: unknown = location.state;
  return (
    isRoomId(params.slug) &&
    isRecord(state) &&
    (state.roomMode === RoomMode.Campaign ||
      ((state.roomMode === RoomMode.Online || state.roomMode === RoomMode.Observer) && isHostConfig(state.hostConfig)))
  );
}

export function isReplayRoute({ location }: PageRoutingProps): boolean {
  const state: unknown = location.state;
  if (!isRecord(state) || !isRecord(state.replayData)) {
    return false;
  }
  const replay = state.replayData;
  return (
    typeof replay.roomId === 'number' &&
    Number.isSafeInteger(replay.roomId) &&
    replay.roomId >= 0 &&
    typeof replay.viewerId === 'string' &&
    isRecord(replay.gameInfo) &&
    Array.isArray(replay.playersInfo) &&
    Array.isArray(replay.events)
  );
}
