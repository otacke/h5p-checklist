/** @constant {number} DRAG_START_THRESHOLD_PX Drag start threshold in pixels. */
const DRAG_START_THRESHOLD_PX = 8;

/**
 * Mixin to handle pointer (mouse and touch) dragging for item lists.
 * @mixin ItemListPointer
 */
export default class ItemListPointer {

  /**
   * Handle mouse down event to start dragging.
   * @param {MouseEvent} event Mouse event.
   */
  handleMouseDown(event) {
    if (event.button !== 0) {
      return; // Only left mouse button
    }

    // Start a pending drag that activates only after a movement threshold.
    this.initiatePointerDown(event, 'mouse');
  }

  /**
   * Initiate a pending drag: record initial coords/item and attach pending listeners.
   * Actual dragging is started only after the movement threshold is exceeded.
   * @param {MouseEvent|TouchEvent} event Pointer down event.
   * @param {'mouse'|'touch'} inputType Type of input.
   */
  initiatePointerDown(event, inputType) {
    const draggedItem = this.getItemByDOM(event.target);
    if (!draggedItem || !draggedItem.canBeMoved()) {
      return;
    }

    const coords = this.getEventCoordinates(event);
    this.pendingDragState = {
      startX: coords.clientX,
      startY: coords.clientY,
      inputType,
      item: draggedItem,
      initialEvent: event,
    };

    // Bind and attach pending listeners (store refs so we can remove them)
    if (inputType === 'mouse') {
      document.addEventListener('mousemove', this.handlePendingMouseMove);
      document.addEventListener('mouseup', this.handlePendingPointerUp, { once: true });
    }
    else {
      // passive is `false` so we can call preventDefault once drag is confirmed
      document.addEventListener('touchmove', this.handlePendingTouchMove, { passive: false });
      document.addEventListener('touchend', this.handlePendingPointerUp, { once: true });
      document.addEventListener('touchcancel', this.handlePendingPointerUp, { once: true });
    }
  }

  /**
   * Get client coordinates from mouse or touch event.
   * @param {MouseEvent|TouchEvent} event Event object.
   * @returns {{clientX: number, clientY: number}} Client coordinates.
   */
  getEventCoordinates(event) {
    if (event.touches && event.touches.length > 0) {
      return {
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY,
      };
    }
    return {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  /**
   * Pending mousemove handler: checks threshold and starts actual drag when exceeded.
   * @param {MouseEvent} event Event object.
   */
  handlePendingMouseMove(event) {
    this.checkPendingThresholdAndStart(event);
  }

  /**
   * Check pending drag threshold and confirm start if exceeded.
   * @param {MouseEvent|TouchEvent} event Event object.
   */
  checkPendingThresholdAndStart(event) {
    if (!this.pendingDragState) {
      return;
    }

    const coords = this.getEventCoordinates(event);
    const dx = coords.clientX - this.pendingDragState.startX;
    const dy = coords.clientY - this.pendingDragState.startY;
    if ((dx * dx + dy * dy) >= (DRAG_START_THRESHOLD_PX * DRAG_START_THRESHOLD_PX)) {
      this.cleanupPendingListeners();
      this.startDraggingPointer(event, this.pendingDragState.inputType, this.pendingDragState.item);
      delete this.pendingDragState;
    }
  }

  /**
   * Remove any pending listeners attached during the "waiting for threshold" phase.
   */
  cleanupPendingListeners() {
    document.removeEventListener('mousemove', this.handlePendingMouseMove);
    document.removeEventListener('mouseup', this.handlePendingPointerUp);
    document.removeEventListener('touchmove', this.handlePendingTouchMove, { passive: false });
    document.removeEventListener('touchend', this.handlePendingPointerUp);
    document.removeEventListener('touchcancel', this.handlePendingPointerUp);
  }

  /**
   * Start dragging an item.
   * @param {MouseEvent|TouchEvent} event Event object.
   * @param {string} inputType Type of input ('mouse' or 'touch').
   * @param {object} [draggedItemArg] Optional pre-resolved dragged item to use instead of deriving from event.target.
   */
  startDraggingPointer(event, inputType, draggedItemArg) {
    const draggedItem = draggedItemArg || this.getItemByDOM(event.target);
    if (!draggedItem || !draggedItem.canBeMoved()) {
      return;
    }

    event.preventDefault();

    const coordinates = this.getEventCoordinates(event);
    this.draggedItem = draggedItem;
    draggedItem.setDragModePointer({ x: coordinates.clientX, y: coordinates.clientY, listDOM: this.itemList });
    this.container.appendChild(draggedItem.getDOM());

    if (inputType === 'mouse') {
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp, { once: true });
    }
    else {
      document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      document.addEventListener('touchend', this.handleTouchEnd, { once: true });
      document.addEventListener('touchcancel', this.handleTouchEnd, { once: true });
    }
  }

  /**
   * Handle mouse move event during dragging.
   * @param {MouseEvent} event Mouse event.
   */
  handleMouseMove(event) {
    this.movePointer(event);
  }

  /**
   * Handle drag move for both mouse and touch.
   * @param {MouseEvent|TouchEvent} event Event object.
   */
  movePointer(event) {
    if (!this.draggedItem) {
      return;
    }

    const coords = this.getEventCoordinates(event);
    this.draggedItem.setDragPosition(coords.clientX, coords.clientY);

    const nodeBelowDraggedItem = this.getNodeBelowDraggedItem(coords.clientY);
    const nodePlaceholder = this.draggedItem.getPlaceholderDOM();

    if (nodeBelowDraggedItem === null) {
      this.itemList.appendChild(nodePlaceholder);
    }
    else {
      this.itemList.insertBefore(nodePlaceholder, nodeBelowDraggedItem);
    }

    event.preventDefault();
  }

  /**
   * Get the element that should appear after the dragged item based on mouse position.
   * @param {number} mouseY Mouse Y coordinate.
   * @returns {HTMLElement|null} DOM element to insert before, or null to append to end.
   */
  getNodeBelowDraggedItem(mouseY) {
    const itemsNotDragged = this.items.filter((item) => !item.isDragging());

    let closestItem = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    itemsNotDragged.forEach((item) => {
      const rect = item.getRect();
      // eslint-disable-next-line no-magic-numbers
      const itemCenterY = rect.top + rect.height / 2;
      const offset = mouseY - itemCenterY;

      /*
       * Only consider items where mouse is above their center (negative offset)
       * Find the one with the smallest negative offset (closest from below)
       */
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closestItem = item;
      }
    });

    return closestItem ? closestItem.getDOM() : null;
  }

  /**
   * Handle touch move event during dragging.
   * @param {TouchEvent} event Touch event.
   */
  handleTouchMove(event) {
    this.movePointer(event);
  }

  /**
   * Handle touch start event to start dragging.
   * @param {TouchEvent} event Touch event.
   */
  handleTouchStart(event) {
    // Start a pending drag that activates only after a movement threshold.
    this.initiatePointerDown(event, 'touch');
  }

  /**
   * Handle mouse up event to end dragging.
   */
  handleMouseUp() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.endDraggingPointer();
  }

  /**
   * End dragging and update item order.
   */
  endDraggingPointer() {
    if (!this.draggedItem) {
      return;
    }

    this.draggedItem.clearDragModePointer();
    this.draggedItem.focus();

    this.updateItemsOrder();
    const targetIndex = this.items.findIndex((item) => item === this.draggedItem);
    this.setCurrentItemIndex(targetIndex);

    delete this.draggedItem;

    this.callbacks.onInteracted();
  }

  /**
   * Handle touch end event to end dragging.
   */
  handleTouchEnd() {
    document.removeEventListener('touchmove', this.handleTouchMove);
    this.endDraggingPointer();
  }

  /**
   * Pending pointer up/cancel: if pointer is released before threshold, cleanup and allow click.
   * @param {MouseEvent|TouchEvent} event Event object.
   */
  handlePendingPointerUp(event) {
    // No drag was started; just cleanup pending listeners so click/tap proceeds normally
    this.cleanupPendingListeners();
    delete this.pendingDragState;
  }

  /**
   * Pending touchmove handler: checks threshold and starts actual drag when exceeded.
   * @param {TouchEvent} event Event object.
   */
  handlePendingTouchMove(event) {
    this.checkPendingThresholdAndStart(event);
  }

  /**
   * Get the element that should appear after the dragged item based on mouse position.
   * @param {number} mouseY Mouse Y coordinate.
   * @returns {HTMLElement|null} DOM element to insert before, or null to append to end.
   */
  getNodeBelowDraggedItem(mouseY) {
    const itemsNotDragged = this.items.filter((item) => !item.isDragging());

    let closestItem = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    itemsNotDragged.forEach((item) => {
      const rect = item.getRect();
      // eslint-disable-next-line no-magic-numbers
      const itemCenterY = rect.top + rect.height / 2;
      const offset = mouseY - itemCenterY;

      /*
       * Only consider items where mouse is above their center (negative offset)
       * Find the one with the smallest negative offset (closest from below)
       */
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closestItem = item;
      }
    });

    return closestItem ? closestItem.getDOM() : null;
  }

  /**
   * Handle touch end event to end dragging.
   */
  handleTouchEnd() {
    document.removeEventListener('touchmove', this.handleTouchMove);
    this.endDraggingPointer();
  }
}
