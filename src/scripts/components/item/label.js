import { extend } from '@services/util.js';
import './label.css';

/**
 * Label for checklist items.
 * @class
 * @param {object} [params] Params for the label.
 * @param {string} [params.text] Text content for the label.
 * @param {boolean} [params.canBeEdited] If true, label is editable.
 * @param {string} [params.id] Optional id for the label element.
 * @param {object} [params.dictionary] Dictionary service for translations.
 * @param {object} [callbacks] Callbacks.
 * @param {function} [callbacks.onInteracted] Called when the label is interacted with.
 */
/* @constant {number} INTERACTION_CALLBACK_DEBOUNCE_TIME_MS Time in milliseconds to debounce interaction callbacks */
const INTERACTION_CALLBACK_DEBOUNCE_TIME_MS = 5000;

export default class Label {
  constructor(params = {}, callbacks = {}) {
    this.params = extend({
      text: '',
      canBeEdited: false,
    }, params);

    this.callbacks = extend({
      onInteracted: () => {},
    }, callbacks);

    this.dom = document.createElement('label');
    this.dom.classList.add('h5p-checklist-item-label');
    if (this.params.id) {
      this.dom.setAttribute('id', this.params.id);
    }

    if (this.params.canBeEdited) {
      this.dom.contentEditable = 'plaintext-only';
      this.dom.setAttribute('role', 'textbox');
      this.dom.setAttribute('aria-multiline', 'false');
      this.dom.setAttribute('aria-label', this.params.dictionary.get('a11y.editableLabel'));

      this.dom.addEventListener('input', () => {
        window.clearTimeout(this.interactionTimeout);
        this.interactionTimeout = window.setTimeout(() => {
          this.callbacks.onInteracted();
        }, INTERACTION_CALLBACK_DEBOUNCE_TIME_MS); // Try to limit the interaction callbacks
      });

      this.dom.addEventListener('blur', () => {
        window.clearTimeout(this.interactionTimeout);
        this.callbacks.onInteracted();
      });
    }

    this.dom.textContent = this.params.text;
  }

  /**
   * Get the DOM element of the label.
   * @returns {HTMLElement} The label's DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Reset label to its initial text.
   */
  reset() {
    this.dom.textContent = this.params.text;
  }

  /**
   * Set tabindex for the label.
   * @param {boolean} isTabbable If true, label is tabbable.
   */
  setTabbable(isTabbable) {
    this.dom.setAttribute('tabindex', (this.params.canBeEdited && isTabbable) ? '0' : '-1');
  }

  /**
   * Get current text of the label.
   * @returns {string} Current label text.
   */
  getText() {
    return this.dom.textContent;
  }
}
