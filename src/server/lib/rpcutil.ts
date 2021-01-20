import SocketIO from "socket.io";

export const addRpcHandler = async <T>(socket: SocketIO.Socket, command: string, handler: ((...arg0: any) => Promise<T>)) => {
  socket.on(command, async (callbackId: number, ...arg0: any) => {
    try {
      socket.emit(command + callbackId, await handler(...arg0));
    } catch (e) {
      socket.emit(command + callbackId, e.toString());
    }
  })
}