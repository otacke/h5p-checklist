import './message-area.css';

/**
 * Message area for checklist status.
 * @class
 */
export default class MessageArea {
  constructor() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-checklist-message-area', 'display-none');
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set message text.
   * @param {string} message Message to display.
   */
  setMessage(message) {
    this.dom.textContent = message;
  }

  /**
   * Toggle visibility.
   * @param {boolean} isVisibleRequested Whether to show the message area.
   */
  toggleVisibility(isVisibleRequested) {
    const isVisible = (typeof isVisibleRequested === 'boolean') ?
      isVisibleRequested :
      this.dom.classList.contains('display-none');

    this.dom.classList.toggle('display-none', !isVisible);
  }
}
