import { Sanguosha } from 'core/game/engine';
import { GameCardExtensions } from 'core/game/game_props';
import { TemporaryRoomCreationInfo } from 'core/game/game_props';
import { RoomId } from 'core/room/room';
import { ChatSocketEvent, LobbySocketEvent } from 'core/shares/types/server_types';
import { ClientConfig, ServerHostTag } from 'props/config_props';
import SocketIOClient from 'socket.io-client';
import {
  ChatPacketObject,
  ConnectionService,
  CreateGameListenerResponse,
  CreateWaitingRoomListenerResponse,
  RoomListListenerResponse,
  VersionCheckListenerResponse,
} from './connection_service';

export class RealConnectionService extends ConnectionService {
  protected chatSocket: SocketIOClient.Socket;
  protected chatHistory: ChatPacketObject[] = [];

  private lobbySockets: Map<ServerHostTag, SocketIOClient.Socket> = new Map<ServerHostTag, SocketIOClient.Socket>();
  private queryRoomListListener: (res: RoomListListenerResponse) => void;
  private createGameListener: (res: Omit<CreateGameListenerResponse, 'hostTag'>) => void;
  private createWaitingRoomListener: (res: Omit<CreateWaitingRoomListenerResponse, 'hostTag'>) => void;
  private pingListener: (ping: number) => void;
  private pingBestHost: Promise<ServerHostTag>[] = [];
  private readonly lobbyEndpoints = new Map<ServerHostTag, string>();
  private readonly pendingRequests = new Set<() => void>();
  private readonly handlers: {
    socket: SocketIOClient.Socket;
    event: string;
    receiver: (...args: any[]) => void;
  }[] = [];
  private closed = false;

  constructor(config: ClientConfig, private readonly requestTimeoutMs = 10000) {
    super();
    const { protocol, host, port } = config.host[0];
    const mainConnectionUrl = `${protocol}://${host}:${port}/`;
    this.chatSocket = SocketIOClient(mainConnectionUrl + 'chat');

    for (const hostInfo of config.host) {
      const endpoint = `${hostInfo.protocol}://${hostInfo.host}:${hostInfo.port}/lobby`;
      this.lobbyEndpoints.set(hostInfo.hostTag, endpoint);
      this.lobbySockets.set(hostInfo.hostTag, SocketIOClient(endpoint));
    }

    this.lobbySockets.forEach((lobbySocket, hostTag) => {
      this.addHandler(lobbySocket, LobbySocketEvent.QueryRoomList.toString(), evt => {
        this.queryRoomListListener?.({
          packet: evt,
          hostTag,
          ping: Math.round((Date.now() - this.pingStartTimestamp) / 2),
        });
      });
      this.addHandler(lobbySocket, LobbySocketEvent.GameCreated.toString(), evt => {
        this.createGameListener?.({
          packet: evt,
          ping: Math.round((Date.now() - this.pingStartTimestamp) / 2),
        });
      });
      this.addHandler(lobbySocket, LobbySocketEvent.CreateWaitingRoom.toString(), evt => {
        this.createWaitingRoomListener?.({
          packet: evt,
          ping: Math.round((Date.now() - this.pingStartTimestamp) / 2),
        });
      });
      this.addHandler(lobbySocket, LobbySocketEvent.PingServer.toString(), () => {
        this.pingListener?.(Math.round((Date.now() - this.pingStartTimestamp) / 2));
      });
      for (const [host, lobbySocket] of this.lobbySockets.entries()) {
        this.pingBestHost.push(
          new Promise<ServerHostTag>(resolve =>
            this.addHandler(lobbySocket, LobbySocketEvent.PingServer.toString(), () => resolve(host)),
          ),
        );
      }
    });
  }

  private addHandler(socket: SocketIOClient.Socket, event: string, receiver: (...args: any[]) => void) {
    if (this.closed) {
      return;
    }
    const ownedReceiver = (...args: any[]) => {
      if (!this.closed) {
        receiver(...args);
      }
    };
    this.handlers.push({ socket, event, receiver: ownedReceiver });
    socket.on(event, ownedReceiver);
  }

  // The legacy server returns an uncorrelated boolean. Isolate each request on
  // its own connection, rather than routing a late reply to a newer callback.
  // This preserves the v2 wire contract, including compatibility with old servers.
  private requestBoolean(
    host: ServerHostTag,
    event: LobbySocketEvent,
    payload: unknown,
    responseEvent: LobbySocketEvent,
    callback: (packet: boolean, ping: number) => void,
  ) {
    const endpoint = this.lobbyEndpoints.get(host);
    if (this.closed || !endpoint) {
      return;
    }
    const socket = SocketIOClient(endpoint, { autoConnect: false, forceNew: true, reconnection: false });
    const started = Date.now();
    let finished = false;
    let sent = false;
    const handlers: { event: string; receiver: (...args: any[]) => void }[] = [];
    const cancel = () => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      for (const handler of handlers) {
        socket.removeListener(handler.event, handler.receiver);
      }
      this.pendingRequests.delete(cancel);
      socket.disconnect();
    };
    const on = (name: string, receiver: (...args: any[]) => void) => {
      handlers.push({ event: name, receiver });
      socket.on(name, receiver);
    };
    on(responseEvent.toString(), packet => {
      if (finished || this.closed || !sent || typeof packet !== 'boolean') {
        return;
      }
      const ping = Math.max(0, Math.round((Date.now() - started) / 2));
      cancel();
      callback(packet, ping);
    });
    on('connect', () => {
      if (!finished && !this.closed && !sent) {
        sent = true;
        socket.emit(event.toString(), payload);
      }
    });
    // Failure means unavailable, not "room does not exist" or "version mismatch".
    // The current public callback has no error channel; cancel silently instead
    // of deleting a valid room or triggering navigation on a transport failure.
    for (const error of ['connect_error', 'connect_timeout', 'error', 'disconnect']) {
      on(error, cancel);
    }
    this.pendingRequests.add(cancel);
    const timer = setTimeout(cancel, this.requestTimeoutMs);
    socket.connect();
  }

  private pingStartTimestamp: number;

  protected readonly lobbyService = {
    getRoomList: (callback: (response: RoomListListenerResponse) => void) => {
      if (this.closed) {
        return;
      }
      this.pingStartTimestamp = Date.now();
      this.queryRoomListListener = callback;
      this.lobbySockets.forEach(lobbySocket => {
        lobbySocket.emit(LobbySocketEvent.QueryRoomList.toString());
      });
    },
    checkCoreVersion: (callback: (response: VersionCheckListenerResponse) => void) => {
      if (this.closed) {
        return;
      }
      this.lobbySockets.forEach((_, hostTag) => {
        this.requestBoolean(
          hostTag,
          LobbySocketEvent.QueryVersion,
          { version: Sanguosha.Version },
          LobbySocketEvent.VersionMismatch,
          (packet, ping) => callback({ packet, hostTag, ping }),
        );
      });
    },
    checkRoomExist: (host: ServerHostTag, id: RoomId, callback: (exist: boolean, ping: number) => void) => {
      this.requestBoolean(host, LobbySocketEvent.CheckRoomExist, id, LobbySocketEvent.CheckRoomExist, callback);
    },
    createWaitingRoom: (
      gameInfo: TemporaryRoomCreationInfo & { roomId?: number },
      callback: (response: CreateWaitingRoomListenerResponse) => void,
    ) => {
      if (this.closed) {
        return;
      }
      this.pingStartTimestamp = Date.now();
      Promise.race(this.pingBestHost).then(serverHost => {
        if (this.closed) {
          return;
        }
        const lobbySocket = this.lobbySockets.get(serverHost)!;
        lobbySocket.emit(LobbySocketEvent.CreateWaitingRoom.toString(), { roomInfo: gameInfo });
        this.createWaitingRoomListener = res => {
          callback({ hostTag: serverHost, ...res });
        };
      });

      for (const [, lobbySocket] of this.lobbySockets.entries()) {
        lobbySocket.emit(LobbySocketEvent.PingServer.toString());
      }
    },
    /**
     * @deprecated game won't be created from lobby anymore.
     */
    createGame: (
      gameInfo: {
        cardExtensions: GameCardExtensions[];
      } & TemporaryRoomCreationInfo & { roomId?: number },
      callback: (response: CreateGameListenerResponse) => void,
    ) => {
      if (this.closed) {
        return;
      }
      this.pingStartTimestamp = Date.now();
      Promise.race(this.pingBestHost).then(serverHost => {
        if (this.closed) {
          return;
        }
        const lobbySocket = this.lobbySockets.get(serverHost)!;
        lobbySocket.emit(LobbySocketEvent.GameCreated.toString(), gameInfo);
        this.createGameListener = res => {
          callback({ ...res, hostTag: serverHost });
        };
      });
      for (const [, lobbySocket] of this.lobbySockets.entries()) {
        lobbySocket.emit(LobbySocketEvent.PingServer.toString());
      }
    },
    ping: (hostTag: ServerHostTag, callback: (ping: number) => void) => {
      if (this.closed) {
        return;
      }
      this.pingStartTimestamp = Date.now();
      const lobbySocket = this.lobbySockets.get(hostTag) as SocketIOClient.Socket;
      this.pingListener = callback;
      lobbySocket.emit(LobbySocketEvent.PingServer.toString());
    },
  };

  protected readonly chatService = {
    send: (message: string, playerName: string) => {
      if (this.closed) {
        return;
      }
      this.chatSocket.emit(ChatSocketEvent.Chat, { message, from: playerName, timestamp: Date.now() });
    },
    disconnect: () => {
      this.addHandler(this.chatSocket, ChatSocketEvent.Chat, data => {
        if (!this.chatHistory.includes(data)) {
          this.chatHistory.push(data);
        }
        if (this.chatHistory.length > 50) {
          this.chatHistory.shift();
        }
      });
    },
    received: (action: (data: ChatPacketObject) => void) => {
      this.addHandler(this.chatSocket, ChatSocketEvent.Chat, data => {
        if (!this.chatHistory.includes(data)) {
          this.chatHistory.push(data);
        }
        if (this.chatHistory.length > 50) {
          this.chatHistory.shift();
        }
        action(data);
      });
    },
    chatHistory: () => this.chatHistory,
  };

  public close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const cancel of Array.from(this.pendingRequests)) {
      cancel();
    }
    for (const { socket, event, receiver } of this.handlers) {
      socket.removeListener(event, receiver);
    }
    this.handlers.length = 0;
    this.chatSocket.close();
    for (const [, socket] of this.lobbySockets) {
      socket.close();
    }
  }
}
