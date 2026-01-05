import { clamp } from '@services/util.js';

/** @constant {number} MOVE_BY_ITEMS_LARGE Number of items to move on PageUp/PageDown */
const MOVE_BY_ITEMS_LARGE = 5;

/**
 * Mixin to add keyboard navigation and dragging support to ItemList.
 * @mixin ItemListKeyboard
 */
export default class ItemListKeyboard {

  /**
   * Handle keydown events for keyboard navigation and dragging.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    const itemDOMs = this.items.map((item) => item.getDOM());
    if (!itemDOMs.includes(event.target)) {
      return; // Only handle if focused on an item
    }

    if (this.draggedItem) {
      return; // Do not handle if dragging with mouse/touch
    }

    const navigationConfigs = {
      'ArrowUp': { selectionDelta: -1, dragDelta: -1 },
      'ArrowDown': { selectionDelta: 1, dragDelta: 1 },
      'Home': { targetIndex: 0, dragDelta: -this.currentItemIndex },
      'End': { targetIndex: this.items.length - 1, dragDelta: this.items.length - 1 - this.currentItemIndex },
      'PageUp': { selectionDelta: -MOVE_BY_ITEMS_LARGE, dragDelta: -MOVE_BY_ITEMS_LARGE },
      'PageDown': { selectionDelta: MOVE_BY_ITEMS_LARGE, dragDelta: MOVE_BY_ITEMS_LARGE },
    };

    const applicableConfig = navigationConfigs[event.key];
    if (applicableConfig) {
      this.moveKeyboardByConfig(applicableConfig);
      event.preventDefault();
      return;
    }

    const commandConfigs = {
      'Escape': () => this.cancelKeyboardDragging(),
      ' ': (event) => this.handleSpaceOrEnter(event),
      'Enter': (event) => this.handleSpaceOrEnter(event),
    };

    const applicableCommand = commandConfigs[event.key];
    if (applicableCommand) {
      applicableCommand(event);
      event.preventDefault();
      return;
    }
  }

  /**
   * Move selection or dragged item using keyboard.
   * @param {object} config Configuration.
   * @param {number} [config.selectionDelta] Delta to move selection by.
   * @param {number} [config.targetIndex] Target index to move selection to.
   * @param {number} [config.dragDelta] Delta to move dragged item by.
   */
  moveKeyboardByConfig(config) {
    if (this.draggedItemKeyboard) {
      this.moveKeyboardItemBy(config.dragDelta);
      return;
    }
    else if (config.targetIndex !== undefined) {
      this.moveKeyboardSelectionTo(config.targetIndex);
    }
    else {
      this.moveKeyboardSelectionBy(config.selectionDelta);
    }
  }

  /**
   * Move keyboard selection by delta.
   * @param {number} selectionDelta Delta to move selection by.
   */
  moveKeyboardSelectionBy(selectionDelta) {
    this.moveKeyboardSelectionTo(this.currentItemIndex + selectionDelta);
  }

  /**
   * Move keyboard selection to target index.
   * @param {number} targetIndex Target index to move selection to.
   */
  moveKeyboardSelectionTo(targetIndex) {
    if (typeof targetIndex !== 'number') {
      return;
    }

    const newIndex = clamp(targetIndex, 0, this.items.length - 1);
    this.setCurrentItemIndex(newIndex);
    this.items[this.currentItemIndex].focus();
  }

  /**
   * Move dragged item by index delta or positions in the list.
   * @param {number} indexDelta Index delta to move by.
   */
  moveKeyboardItemBy(indexDelta) {
    const currentIndex = this.items.indexOf(this.draggedItemKeyboard);
    if (currentIndex === -1) {
      return;
    }

    this.moveKeyboardItemTo(currentIndex + indexDelta);
  }

  /**
   * Move dragged item to target index.
   * @param {number} targetIndex Target index to move to.
   */
  moveKeyboardItemTo(targetIndex) {
    if (typeof targetIndex !== 'number' || !this.draggedItemKeyboard) {
      return;
    }

    const currentIndex = this.items.indexOf(this.draggedItemKeyboard);
    if (currentIndex === -1) {
      return;
    }

    const clampedTargetIndex = clamp(targetIndex, 0, this.items.length - 1);
    if (targetIndex !== clampedTargetIndex) {
      const ariaMessage = this.params.dictionary.get('a11y.keyboardDragLimitReached');
      this.callbacks.read(ariaMessage);
    }

    if (clampedTargetIndex === currentIndex) {
      return;
    }

    this.performKeyboardDrag(currentIndex, clampedTargetIndex);
  }

  /**
   * Perform the actual keyboard drag operation.
   * @param {number} currentIndex Current index of dragged item.
   * @param {number} targetIndex Target index to move to.
   */
  performKeyboardDrag(currentIndex, targetIndex) {
    this.skipKeyboardDragCancelOnFocusout = true;

    // Move dragged item to new position in DOM
    const insertBeforeNode = (targetIndex > currentIndex) ?
      this.items[targetIndex].getDOM().nextSibling || null :
      this.items[targetIndex].getDOM();
    this.itemList.insertBefore(this.draggedItemKeyboard.getDOM(), insertBeforeNode);

    this.updateItemsOrder();
    this.setCurrentItemIndex(targetIndex);
    this.items[targetIndex].focus();

    this.callbacks.onInteracted();

    const ariaMessage = this.params.dictionary.get('a11y.keyboardDragMoved')
      .replace('@target', (targetIndex + 1).toString());
    this.callbacks.read(ariaMessage);

    window.requestAnimationFrame(() => {
      this.skipKeyboardDragCancelOnFocusout = false;
    });
  }

  /**
   * Cancel keyboard dragging and return item to original position.
   */
  cancelKeyboardDragging() {
    if (!this.draggedItemKeyboard) {
      return;
    }

    const ariaMessage = this.params.dictionary.get('a11y.keyboardDragCanceled');
    this.callbacks.read(ariaMessage);

    this.moveKeyboardItemTo(this.draggedItemKeyboard.getDragStartIndex());
    this.endDraggingKeyboard();
  }

  /**
   * End dragging and update item order.
   */
  endDraggingKeyboard() {
    if (!this.draggedItemKeyboard) {
      return;
    }

    this.draggedItemKeyboard.clearDragModeKeyboard();
    delete this.draggedItemKeyboard;
  }

  /**
   * Handle space or enter key to start or end dragging.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleSpaceOrEnter(event) {
    const item = this.items[this.currentItemIndex];
    if (!item?.canBeMoved()) {
      return;
    }

    if (!this.draggedItemKeyboard) {
      this.startDraggingKeyboard(item);
    }
    else {
      this.endDraggingKeyboard();
    }
  }

  /**
   * Start dragging an item using keyboard.
   * @param {object} item Item to start dragging.
   */
  startDraggingKeyboard(item) {
    if (!item?.canBeMoved()) {
      return;
    }

    this.draggedItemKeyboard = item;
    this.draggedItemKeyboard.setDragModeKeyboard({ startIndex: this.items.indexOf(item) });

    const ariaMessage = this.params.dictionary.get('a11y.keyboardDragStarted');
    this.callbacks.read(ariaMessage);
  }
}
