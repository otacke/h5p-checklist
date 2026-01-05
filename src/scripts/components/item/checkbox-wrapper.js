import { extend } from '@services/util.js';
import './checkbox-wrapper.css';
import Label from './label.js';

export default class CheckboxWrapper {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {string} params.text Label text.
   * @param {boolean} params.canBeUnchecked Whether the checkbox can be unchecked once checked.
   * @param {boolean} params.checked Initial checked state.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({
      text: '',
      canBeUnchecked: true,
      checked: false,
    }, params);

    this.callbacks = extend({
      onInteracted: () => {},
    }, callbacks);

    this.checkedState = this.params.checked;
    this.disabledState = false;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-checklist-item-checkbox-wrapper');

    const labelId = H5P.createUUID();

    this.checkbox = document.createElement('div');
    this.checkbox.classList.add('h5p-checklist-item-checkbox');
    this.checkbox.setAttribute('role', 'checkbox');
    this.checkbox.setAttribute('tabindex', '0');
    this.checkbox.setAttribute('aria-labelledby', labelId);

    this.dom.addEventListener('click', (event) => {
      this.handleClick(event);
    });

    this.dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    this.toggleChecked(this.checkedState);
    this.dom.appendChild(this.checkbox);

    this.label = new Label(
      {
        id: labelId,
        text: this.params.text,
        canBeEdited: this.params.canBeEdited,
        dictionary: this.params.dictionary,
      },
      {
        onInteracted: () => {
          this.callbacks.onInteracted();
        },
      },
    );
    this.dom.appendChild(this.label.getDOM());

    this.toggleEnabled(!this.params.checked || this.params.canBeUnchecked);
  }

  /**
   * Set whether the checkbox is tabbable.
   * @param {boolean} isTabbable Whether the checkbox should be tabbable.
   */
  setTabbable(isTabbable) {
    this.checkbox.setAttribute('tabindex', isTabbable ? '0' : '-1');
    this.label.setTabbable(isTabbable);
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Handle click on checkbox.
   * @param {Event} event Click event.
   */
  handleClick(event) {
    if (this.params.canBeEdited && (event.target === this.label.getDOM())) {
      return;
    }

    if (!this.params.canBeUnchecked && this.checkedState) {
      event.preventDefault();
      return;
    }

    this.toggleChecked();

    if (!this.params.canBeUnchecked && this.checkedState) {
      this.toggleEnabled(false);
    }

    this.callbacks.onInteracted();
  }

  /**
   * Handle keydown event.
   * @param {KeyboardEvent} event Keydown event.
   */
  handleKeydown(event) {
    if (event.key !== ' ' && event.key !== 'Enter') {
      return;
    }

    this.handleClick(event);
  }

  /**
   * Toggle enabled/disabled state.
   * @param {boolean} requestedState Requested enabled state.
   */
  toggleEnabled(requestedState) {
    this.disabledState = (typeof requestedState === 'boolean') ? requestedState : !this.disabledState;
    this.checkbox.classList.toggle('disabled', !this.disabledState);
    this.checkbox.setAttribute('aria-disabled', !this.disabledState);
  }

  /**
   * Toggle checked state.
   * @param {boolean} requestedState Requested checked state.
   * @returns {boolean} Current checked state.
   */
  toggleChecked(requestedState) {
    this.checkedState = (typeof requestedState === 'boolean') ? requestedState : !this.checkedState;
    this.checkbox.checked = this.checkedState;
    this.checkbox.setAttribute('aria-checked', this.checkedState);

    return this.checkedState;
  }

  /**
   * Reset checkbox to initial state.
   */
  reset() {
    this.toggleChecked(this.params.checked);
    if (!this.params.canBeUnchecked && this.checkedState) {
      this.toggleEnabled(false);
    }
    else {
      this.toggleEnabled(true);
    }

    this.label.reset();
  }

  /**
   * Determine whether the checkbox is checked.
   * @returns {boolean} True if checked, false otherwise.
   */
  isChecked() {
    return this.checkedState;
  }

  /**
   * Get label component.
   * @returns {Label} Label component.
   */
  getLabel() {
    return this.label;
  }
}
