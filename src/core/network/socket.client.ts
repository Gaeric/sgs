import { ClientEventFinder, GameEventIdentifiers, ServerEventFinder, WorkPlace } from 'core/event/event';
import { Socket } from 'core/network/socket';
import IOSocketClient from 'socket.io-client';

export class ClientSocket extends Socket<WorkPlace.Client> {
  private socketIO: SocketIOClient.Socket;
  private reconnecting: boolean = false;
  private disposed: boolean = false;
  private readonly handlers: { event: string; receiver: (...args: any[]) => void }[] = [];
  private readonly reconnectCallbacks: (() => void)[] = [];

  constructor(endpoint: string, protected roomId: string) {
    super();
    this.init(endpoint);
  }

  protected init(endpoint: string) {
    this.socketIO = IOSocketClient(endpoint, {
      reconnection: true,
      reconnectionAttempts: 3,
      timeout: 60000,
    });
    this.addHandler('reconnect', () => {
      this.reconnecting = true;
    });
    this.addHandler('connect', () => {
      if (this.reconnecting) {
        this.reconnecting = false;
        for (const callback of this.reconnectCallbacks.slice()) {
          if (this.disposed) {
            break;
          }
          callback();
        }
      }
    });
  }

  private addHandler(event: string, receiver: (...args: any[]) => void) {
    if (this.disposed) {
      return;
    }
    const ownedReceiver = (...args: any[]) => {
      if (!this.disposed) {
        receiver(...args);
      }
    };
    this.handlers.push({ event, receiver: ownedReceiver });
    this.socketIO.on(event, ownedReceiver);
  }

  public notify<I extends GameEventIdentifiers>(type: I, content: ClientEventFinder<I>) {
    if (!this.disposed) {
      this.socketIO.emit(type.toString(), content);
    }
  }

  public on<T extends GameEventIdentifiers>(type: T, receiver: (event: ServerEventFinder<T>) => void): ClientSocket {
    this.addHandler(type.toString(), receiver);

    return this;
  }

  public async waitForResponse(): Promise<any> {
    throw new Error("Shouldn't call waitForResponse function in client socket");
  }
  public broadcast() {
    throw new Error("Shouldn't call broadcast function in client socket");
  }
  public emitRoomStatus() {
    throw new Error("Shouldn't call emitRoomStatus function in client socket");
  }

  public onReconnected(callback: () => void) {
    if (!this.disposed) {
      this.reconnectCallbacks.push(callback);
    }
  }

  public disconnect() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.reconnecting = false;
    for (const { event, receiver } of this.handlers) {
      this.socketIO.removeListener(event, receiver);
    }
    this.handlers.length = 0;
    this.reconnectCallbacks.length = 0;
    this.socketIO.disconnect();
  }
}
