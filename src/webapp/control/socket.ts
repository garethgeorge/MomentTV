import io from "socket.io-client";

export const socket = io("./");

export const awaitConnected = async () => {
  return new Promise((accept, reject) => {
    const onConnect = (arg) => {
      accept(arg);
      socket.removeListener("connect_error", onReject);
    };

    const onReject = (err) => {
      reject(err);
      socket.removeListener("connected", onConnect);
    };

    socket.once("connected", onConnect);
    socket.once("connect_error", onReject);
  });
};

let callbackIdx = 0;
export const rpcCall = <T>(command: string, ...args: any[]): Promise<T> => {
  return new Promise((accept, reject) => {
    let callbackId = callbackIdx++;
    socket.emit(command, callbackId, ...args);
    socket.once(command + callbackId, (err, res) => {
      if (err) return reject(new Error(err));
      return accept(res);
    });
  });
};
