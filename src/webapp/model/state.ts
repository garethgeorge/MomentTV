import { makeAutoObservable } from "mobx";

export default new (makeAutoObservable(
  class State {
    loadingTasks: number = 0;
  }
))();
