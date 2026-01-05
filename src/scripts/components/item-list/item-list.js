import Item from '@components/item/item.js';
import { addMixins, extend } from '@services/util.js';
import ItemListKeyboard from './item-list-mixin-keyboard.js';
import ItemListPointer from './item-list-mixin-pointer.js';
import './item-list.css';

/**
 * @mixes ItemListPointer
 * @mixes ItemListKeyboard
 */
export default class ItemList {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object[]} params.items Items to initialize the list with.
   * @param {object} params.dictionary Dictionary service for translations.
   * @param {object} params.behavior Behavior parameters.
   * @param {boolean} params.behavior.userCanManageItems Whether the user can manage items.
   * @param {boolean} params.behavior.userCanManageSegmentTitles Whether the user can manage segment titles.
   * @param {object} callbacks Callbacks.
   * @param {function} [callbacks.onInteracted] Called on user interaction.
   * @param {function} [callbacks.onListItemsChanged] Called when the list of items changes.
   * @param {function} [callbacks.read] Called to read text via screen reader.
   */
  constructor(params = {}, callbacks = {
    onInteracted: () => {},
    onListItemsChanged: () => {},
    read: () => {},
  }) {
    try {
      addMixins(ItemList, [ItemListKeyboard, ItemListPointer]);
    }
    catch (error) {
      console.error('Could not apply mixins:', error);
    }

    this.params = extend({}, params);

    this.callbacks = extend({
      onInteracted: () => {},
      onListItemsChanged: () => {},
    }, callbacks);

    this.skipKeyboardDragCancelOnFocusout = false;

    const { dom, itemList } = this.createDOM();
    this.dom = dom;
    this.itemList = itemList;
    this.items = this.initializeItems(params.items);

    this.setupEventListeners();

    // TODO: Only if there are items
    this.setCurrentItemIndex(0);

    this.handlePendingMouseMove = this.handlePendingMouseMove.bind(this);
    this.handlePendingPointerUp = this.handlePendingPointerUp.bind(this);
    this.handlePendingTouchMove = this.handlePendingTouchMove.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    // Fallback needed for dragging, will be overridden once parent is attached and user cannot drag before, so okay
    this.setContainer(document.body);
  }

  /**
   * Create DOM element.
   * @returns {HTMLElement} DOM element.
   */
  createDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-checklist-item-list-wrapper');

    const instructionsId = H5P.createUUID();
    const instructions = document.createElement('div');
    instructions.classList.add('h5p-checklist-item-list-instructions');
    instructions.setAttribute('id', instructionsId);
    instructions.textContent = this.params.dictionary.get('a11y.itemListInstructions');
    dom.appendChild(instructions);

    const itemList = document.createElement('ul');
    itemList.classList.add('h5p-checklist-item-list');
    itemList.setAttribute('role', 'application');
    itemList.setAttribute('tabindex', '0');
    itemList.setAttribute('aria-label', this.params.dictionary.get('a11y.itemList'));
    itemList.setAttribute('aria-describedby', instructionsId);
    dom.appendChild(itemList);

    return { dom, itemList };
  }

  /**
   * Initialize items.
   * @param {object[]} itemParams Item parameters.
   * @returns {Item[]} Initialized items.
   */
  initializeItems(itemParams = {}) {
    return itemParams
      .filter((itemParams) => (itemParams.text ?? '').trim() !== '')
      .map((itemParams) => {
        return this.createItem(itemParams, true);
      });
  }

  /**
   * Create an item with callbacks.
   * @param {object} itemParams Item parameters.
   * @param {boolean} appendToDOM Whether to append the item DOM to the parent.
   * @returns {Item} Created item.
   */
  createItem(itemParams, appendToDOM = false) {
    const item = new Item(
      { ...itemParams, dictionary: this.params.dictionary },
      {
        onRemoveRequested: (item) => {
          this.removeItem(item);
          this.callbacks.onListItemsChanged();
        },
        onInteracted: () => {
          this.callbacks.onInteracted();
        },
      },
    );

    if (appendToDOM) {
      this.itemList.appendChild(item.getDOM());
    }

    return item;
  }

  /**
   * Setup event listeners.
   */
  setupEventListeners() {
    if (!this.items.some((item) => item.params.canBeMoved)) {
      return;
    }

    this.itemList.addEventListener('dragstart', (event) => {
      event.preventDefault(); // Disable native dragging, fixes edge case
    });

    this.itemList.addEventListener('mousedown', (event) => {
      this.handleMouseDown(event);
    });

    this.itemList.addEventListener('touchstart', (event) => {
      this.handleTouchStart(event);
    }, { passive: false });

    this.itemList.addEventListener('focus', (event) => {
      const item = this.getItemByDOM(event.target);
      if (!item) {
        this.items[this.currentItemIndex].focus();
        return;
      }
    });

    this.itemList.addEventListener('focusin', (event) => {
      this.itemList.setAttribute('tabindex', '-1');
    });

    this.itemList.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    this.itemList.addEventListener('focusout', (event) => {
      const relatedItem = this.getItemByDOM(event.relatedTarget);
      if (!relatedItem) {
        this.itemList.setAttribute('tabindex', '0');
        this.items[this.currentItemIndex].setContentTabbable(false);
      }

      if (this.skipKeyboardDragCancelOnFocusout) {
        return;
      }

      if (this.draggedItemKeyboard?.getDOM() === event.relatedTarget) {
        return;
      }

      this.cancelKeyboardDragging();
    });
  }

  /**
   * Set the current item index and update tabbable state accordingly.
   * @param {number} index Index to set as current.
   */
  setCurrentItemIndex(index) {
    if (index < 0 || index >= this.items.length) {
      return;
    }

    this.currentItemIndex = index;
    this.items.forEach((item, itemIndex) => {
      item.setTabbable(itemIndex === this.currentItemIndex);
    });
  }

  /**
   * Find item by dom element. The dom element can be any child of the item.
   * @param {HTMLElement} domElement DOM element to find item for.
   * @returns {Item|undefined} Found item or undefined.
   */
  getItemByDOM(domElement) {
    return this.items.find((item) => item.getDOM().contains(domElement));
  }

  /**
   * Set container to attach the draggables to when dragging.
   * @param {HTMLElement} container Container element.
   */
  setContainer(container) {
    if (!(container instanceof HTMLElement)) {
      return;
    }

    this.container = container;
  }

  /**
   * Add item by user to the list.
   * @param {object} params Parameters for the new item.
   * @param {string} params.type Type of the item.
   * @param {string} params.text Text of the item.
   */
  addItem(params) {
    const newItem = this.createItem({
      type: params.type,
      text: params.text,
      canBeEdited: true,
      canBeRemoved: true,
      canBeMoved: true,
      checked: false,
    }, true);
    newItem.setTabbable(false);

    this.items.push(newItem);

    this.callbacks.read(this.params.dictionary.get('a11y.itemAdded'));
    this.callbacks.onListItemsChanged();
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return { items: this.items.map((item) => item.getCurrentState()) };
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get number of items in the list.
   * @returns {number} Number of items.
   */
  getLength() {
    return this.items.length;
  }

  /**
   * Get current score.
   * @returns {number} Score.
   */
  getScore() {
    const checkableItems = this.items.filter((item) => item.isCheckable());

    return checkableItems.every((item) => item.isChecked()) ? 1 : 0;
  }

  /**
   * Remove item from the list.
   * @param {Item} itemToRemove Item to remove.
   */
  removeItem(itemToRemove) {
    // Remove item from list
    const itemIndex = this.items.indexOf(itemToRemove);
    if (itemIndex === -1) {
      return;
    }

    itemToRemove.remove();
    this.items.splice(itemIndex, 1);

    if (this.items.length) {
      const newIndex = Math.min(itemIndex, this.items.length - 1);
      this.setCurrentItemIndex(newIndex);
    }
    else {
      this.currentItemIndex = undefined; // No items left
    }

    this.items[this.currentItemIndex]?.focus();

    this.callbacks.read(this.params.dictionary.get('a11y.itemRemoved'));

    this.callbacks.onInteracted();
  }

  /**
   * Reset list.
   */
  reset() {
    this.setCurrentItemIndex(0);
    this.itemList.innerHTML = '';

    this.items = this.initializeItems(this.params.items);
  }

  /**
   * Set current state.
   * @param {object} state State to set.
   */
  setCurrentState(state) {
    this.setCurrentItemIndex(0);
    this.itemList.innerHTML = '';

    this.items = this.initializeItems(state.items);
  }

  /**
   * Toggle visibility of the item list.
   * @param {boolean} [showRequested] Whether to show the item list. If omitted, visibility is toggled.
   */
  toggleVisibility(showRequested) {
    const show = (typeof showRequested === 'boolean') ?
      showRequested :
      !this.itemList.classList.contains('display-none');
    this.itemList.classList.toggle('display-none', !show);
  }

  /**
   * Update items order based on their DOM position.
   */
  updateItemsOrder() {
    this.items = Array.from(this.itemList.children).map((el) => this.items.find((item) => item.getDOM() === el));
  }
}
