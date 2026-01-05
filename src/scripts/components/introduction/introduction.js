import './introduction.css';

export default class Introduction {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {string} params.text Introduction text.
   */
  constructor(params = {}) {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-checklist-introduction');
    this.dom.innerHTML = params.text ?? '';
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }
}
