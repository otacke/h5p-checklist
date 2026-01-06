import { extend } from '@services/util.js';
import CheckboxWrapper from './checkbox-wrapper.js';
import Label from './label.js';
import './item.css';

export default class ItemView {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {string} params.type Item type: 'checkable' or 'segment-title'.
   * @param {boolean} params.checked Initial checked state (for 'checkable' type).
   * @param {string} params.text Item label text.
   * @param {boolean} params.canBeUnchecked Whether the checkbox can be unchecked once checked (for 'checkable' type).
   * @param {boolean} params.canBeEdited Whether the label can be edited.
   * @param {boolean} params.canBeMoved Whether the item can be moved.
   * @param {boolean} params.canBeRemoved Whether the item can be removed.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onRemoveRequested Callback when remove is requested.
   * @param {function} callbacks.onInteracted Callback when the item is interacted with.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({
      type: 'checkable',
      checked: false,
      text: '',
      canBeUnchecked: true,
      canBeEdited: false,
      canBeMoved: false,
      canBeRemoved: false,
    }, params);

    this.callbacks = extend({
      onRemoveRequested: () => {},
      onInteracted: () => {},
    }, callbacks);

    this.dom = document.createElement('li');
    this.dom.classList.add('h5p-checklist-item', this.params.type);
    this.dom.setAttribute('role', 'listitem');

    this.dom.addEventListener('focusin', () => {
      this.setContentTabbable(true);
      this.dom.classList.add('highlighted');
    });

    this.dom.addEventListener('focusout', () => {
      this.dom.classList.remove('highlighted');
    });

    if (this.params.canBeMoved) {
      this.dom.classList.add('has-handle');
      this.dom.setAttribute('aria-grabbed', 'false');
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('h5p-checklist-item-content-wrapper');
    this.dom.appendChild(contentWrapper);

    if (this.params.type === 'checkable') {
      this.checkboxWrapper = new CheckboxWrapper(
        this.params,
        {
          onInteracted: () => {
            this.callbacks.onInteracted();
          },
        },
      );
      contentWrapper.appendChild(this.checkboxWrapper.getDOM());
    }
    else if (this.params.type === 'segment-title') {
      this.label = new Label(
        {
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
      contentWrapper.appendChild(this.label.getDOM());
    }

    if (this.params.canBeRemoved) {
      this.buttonRemove = document.createElement('button');
      this.buttonRemove.type = 'button';
      this.buttonRemove.classList.add('h5p-checklist-item-button-remove');
      this.buttonRemove.setAttribute('aria-label', this.params.dictionary.get('a11y.removeItem'));

      this.buttonRemove.addEventListener('click', () => {
        this.callbacks.onRemoveRequested(this);
      });
      contentWrapper.appendChild(this.buttonRemove);
    }

    this.updateAriaLabel();
  }

  /**
   * Set whether the item is tabbable.
   * @param {boolean} isTabbable Whether the item should be tabbable.
   */
  setTabbable(isTabbable) {
    this.dom.setAttribute('tabindex', isTabbable ? '0' : '-1');
    this.setContentTabbable(isTabbable);
  }

  /**
   * Set whether the content elements are tabbable.
   * @param {boolean} isTabbable Whether the content should be tabbable.
   */
  setContentTabbable(isTabbable) {
    this.checkboxWrapper?.setTabbable(isTabbable);
    this.buttonRemove?.setAttribute('tabindex', isTabbable ? '0' : '-1');
  }

  /**
   * Update the aria-label attribute based on the current state.
   */
  updateAriaLabel() {
    const parts = [];

    if (this.params.type === 'checkable') {
      const checkTextKey = this.isChecked() ? 'a11y.checked' : 'a11y.unchecked';
      parts.push(this.params.dictionary.get(checkTextKey));
    }
    else {
      parts.push(this.params.dictionary.get('a11y.segmentTitle'));
    }

    parts.push(this.getLabelText());

    if (this.params.canBeMoved) {
      parts.push(this.params.dictionary.get('a11y.draggable'));
    }

    if (this.params.canBeEdited) {
      parts.push(this.params.dictionary.get('a11y.editable'));
    }

    this.dom.setAttribute('aria-label', parts.join('. '));
  }

  /**
   * Focus the item.
   */
  focus() {
    this.dom.focus();
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get the bounding rectangle of the item.
   * @returns {DOMRect} Bounding rectangle.
   */
  getRect() {
    return this.dom.getBoundingClientRect();
  }

  /**
   * Reset the item to its initial state.
   */
  reset() {
    this.checkboxWrapper?.reset();
    this.label?.reset();
  }

  /**
   * Detemine whether the item can be moved.
   * @returns {boolean} True if the item can be moved, false otherwise.
   */
  canBeMoved() {
    return this.params.canBeMoved === true;
  }

  /**
   * Determine whether the item is being dragged.
   * @returns {boolean} True if the item is being dragged, false otherwise.
   */
  isDragging() {
    return this.dragState === true;
  }

  /**
   * Set the item to drag mode using pointer interaction.
   * @param {object} params Parameters.
   * @param {number} params.x X coordinate of the pointer.
   * @param {number} params.y Y coordinate of the pointer.
   * @param {HTMLElement} params.listDOM DOM element of the list the item belongs to.
   */
  setDragModePointer(params = { x: 0, y: 0 }) {
    this.dragState = true;

    const rect = this.getRect();
    this.dom.classList.add('is-dragging'); // This will change the telemetry, so getRect() is called before
    this.dom.setAttribute('aria-grabbed', 'true');

    this.setDragMouseOffset({ x: params.x - rect.left, y: params.y - rect.top });
    this.setDragSize(rect.width, rect.height);
    this.setDragPosition(params.x, params.y);

    this.setPlaceholder(rect.width, rect.height, params.listDOM);
  }

  /**
   * Clear drag mode set by pointer interaction.
   */
  clearDragModePointer() {
    this.dragState = false;
    this.dom.classList.remove('is-dragging');
    this.dom.setAttribute('aria-grabbed', 'false');

    this.clearDragMouseOffset();
    this.clearDragPosition();
    this.clearDragSize();

    this.clearPlaceholder();

    // Workaround: After dropping editable labels are selected otherwise.
    const selection = window.getSelection();
    selection.removeAllRanges();
  }

  /**
   * Get the start index when drag mode was initiated via keyboard.
   * @returns {number|undefined} Start index, or undefined if not in keyboard drag mode.
   */
  getDragStartIndex() {
    return this.dragStartIndex;
  }

  /**
   * Set offset between mouse and top-left of item when dragging.
   * @param {object} offset Offset.
   * @param {number} offset.x X offset.
   * @param {number} offset.y Y offset.
   */
  setDragMouseOffset(offset) {
    this.dragMouseOffset = offset;
  }

  /**
   * Clear mouse offset used when dragging.
   */
  clearDragMouseOffset() {
    delete this.dragMouseOffset;
  }

  /**
   * Set placeholder element in the list.
   * @param {number} width Width of placeholder.
   * @param {number} height Height of placeholder.
   * @param {HTMLElement} parentElement Parent element to insert placeholder into.
   */
  setPlaceholder(width, height, parentElement) {
    this.placeholder = document.createElement('li');
    this.placeholder.style.height = `${height}px`;
    this.placeholder.style.width = `${width}px`;

    if (parentElement) {
      parentElement.insertBefore(this.placeholder, this.dom.nextSibling);
    }
  }

  /**
   * Get placeholder DOM element.
   * @returns {HTMLElement} Placeholder DOM element.
   */
  getPlaceholderDOM() {
    return this.placeholder;
  }

  /**
   * Clear placeholder element from the list.
   */
  clearPlaceholder() {
    if (this.placeholder && this.placeholder.parentNode) {
      this.placeholder.parentNode.replaceChild(this.dom, this.placeholder);
    }

    delete this.placeholder;
  }

  /**
   * Set the position of the dragged item based on mouse coordinates.
   * @param {number} mouseX X coordinate of the mouse.
   * @param {number} mouseY Y coordinate of the mouse.
   */
  setDragPosition(mouseX, mouseY) {
    if (!this.isDragging() ||
      typeof mouseX !== 'number' || typeof mouseY !== 'number' ||
      !this.dragMouseOffset
    ) {
      return; // Not dragging
    }

    this.dom.style.setProperty('--drag-left', `${mouseX - this.dragMouseOffset.x}px`);
    this.dom.style.setProperty('--drag-top', `${mouseY - this.dragMouseOffset.y}px`);
  }

  /**
   * Clear the drag position styles.
   */
  clearDragPosition() {
    if (this.isDragging()) {
      return; // Still dragging
    }

    this.dom.style.removeProperty('--drag-left');
    this.dom.style.removeProperty('--drag-top');
  }

  /**
   * Set the size of the dragged item.
   * @param {number} width Width of the dragged item.
   * @param {number} height Height of the dragged item.
   */
  setDragSize(width, height) {
    if (!this.isDragging() || typeof width !== 'number' || typeof height !== 'number') {
      return; // Not dragging
    }

    this.dom.style.setProperty('--drag-width', `${width}px`);
    this.dom.style.setProperty('--drag-height', `${height}px`);
  }

  /**
   * Clear the size of the dragged item.
   */
  clearDragSize() {
    if (this.isDragging()) {
      return; // Still dragging
    }

    this.dom.style.removeProperty('--drag-width');
    this.dom.style.removeProperty('--drag-height');
  }

  /**
   * Set the item to drag mode using keyboard interaction.
   * @param {object} params Parameters.
   * @param {number} params.startIndex Index where the item was located when drag mode started.
   */
  setDragModeKeyboard(params = { startIndex: 0 }) {
    this.dragStartIndex = params.startIndex;
    this.dom.classList.add('highlighted');
  }

  /**
   * Clear drag mode set by keyboard interaction.
   */
  clearDragModeKeyboard() {
    delete this.dragStartIndex;
    this.dom.classList.remove('highlighted');
  }

  /**
   * Remove the item from the DOM.
   */
  remove() {
    this.dom.remove();
  }

  /**
   * Get the label text of the item.
   * @returns {string} Label text.
   */
  getLabelText() {
    const label = this.label ?? this.checkboxWrapper.getLabel();
    return label.getText();
  }

  /**
   * Determine whether the item is checkable.
   * @returns {boolean} True if checkable, false otherwise.
   */
  isCheckable() {
    return this.params.type === 'checkable';
  }

  /**
   * Determine whether the item is checked.
   * @returns {boolean} True if checked, false otherwise.
   */
  isChecked() {
    return this.checkboxWrapper?.isChecked() ?? false;
  }

  /**
   * Get the current state of the item.
   * @returns {object} Current state.
   */
  getCurrentState() {
    const state = {
      type: this.params.type,
      text: this.getLabelText(),
      canBeMoved: this.params.canBeMoved,
      canBeRemoved: this.params.canBeRemoved,
      canBeEdited: this.params.canBeEdited,
    };

    if (this.isCheckable()) {
      state.checked = this.isChecked();
      state.canBeUnchecked = this.params.canBeUnchecked;
    }

    return state;
  }
}
