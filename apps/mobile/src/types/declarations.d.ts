declare module 'socket.io-client' {
  export interface Socket {
    connected?: boolean;
    emit(event: string, ...args: any[]): this;
    on(event: string, listener: (...args: any[]) => void): this;
    disconnect(): this;
  }
  export function io(uri: string, opts?: any): Socket;
}
