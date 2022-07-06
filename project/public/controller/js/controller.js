import View from "./view.js";
import Service from "./service.js";

/**
 * @typedef {object} Deps
 * @prop {View.prototype} view
 * @prop {Service.prototype} service
 */

export default class Controller {
  /**  
   * @param {Deps} deps   
   */
  constructor({ view, service }) {
    this.view = view;
    this.service = service;
  }

  /**  
   * @param {Deps} deps   
   */
  static initialize(deps) {
    const controller = new Controller(deps);
    controller.onLoad();
    
    return controller;
  }

  async commandReceived(text) {
    return this.service.makeRequest({
      command: text.toLowerCase(),
    });
  }

  onLoad() {
    this.view.configureOnBtnClick(this.commandReceived.bind(this));
    this.view.onLoad();
  }
}