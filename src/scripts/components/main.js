import Introduction from '@components/introduction/introduction.js';
import ItemList from '@components/item-list/item-list.js';
import ItemListButtons from '@components/item-list-buttons/item-list-buttons.js';
import MessageArea from '@components/message-area/message-area.js';
import Screenreader from '@services/screenreader.js';
import { extend } from '@services/util.js';
import './main.css';

/** @constant {number} TOAST_OFFSET_VERTICAL_PX Vertial offset from element to toast message. */
const TOAST_OFFSET_VERTICAL_PX = 5;

/**
 * Main checklist wrapper.
 * @class
 * @param {object} params Parameters.
 * @param {object} callbacks Callbacks.
 * @param {function} [callbacks.onCompleted] Called when checklist is completed.
 * @param {function} [callbacks.onInteracted] Called on user interaction.
 * @param {function} [callbacks.onResized] Called when size changes.
 */
export default class Main {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({}, params);

    this.callbacks = extend({
      onCompleted: () => {},
      onInteracted: () => {},
      onResized: () => {},
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-checklist-main');
    this.dom.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'c') {
        this.copyItemsToClipboard();
      }
    });

    this.wasAnswerGiven = false;

    const introduction = new Introduction({ text: this.params.introductionText });
    this.dom.appendChild(introduction.getDOM());

    this.itemList = new ItemList(
      {
        items: this.params.items,
        dictionary: this.params.dictionary,
        behavior: {
          userCanManageItems: this.params.behaviour.userCanManageItems,
          userCanManageSegmentTitles: this.params.behaviour.userCanManageSegmentTitles,
        },
      },
      {
        onInteracted: () => {
          this.handleUserInteracted();
        },
        onListItemsChanged: () => {
          this.toggleNoItemsMessage();
          this.callbacks.onResized();
        },
        read: (text) => {
          Screenreader.read(text);
        },
      },
    );

    this.dom.appendChild(this.itemList.getDOM());

    this.messageArea = new MessageArea();
    this.dom.appendChild(this.messageArea.getDOM());

    this.itemListButtons = new ItemListButtons({
      canAddItems: this.params.behaviour.userCanManageItems,
      canAddSegmentTitles: this.params.behaviour.userCanManageSegmentTitles,
      canCopy: !!navigator.clipboard,
      dictionary: this.params.dictionary,
    }, {
      onAddItemRequested: () => {
        this.itemList.addItem({ type: 'checkable', text: this.params.dictionary.get('l10n.newItem') });
      },
      onAddSegmentTitleRequested: () => {
        this.itemList.addItem({ type: 'segment-title', text: this.params.dictionary.get('l10n.newSegmentTitle') });
      },
      onCopyRequested: () => {
        this.copyItemsToClipboard();
      },
    });
    this.dom.appendChild(this.itemListButtons.getDOM());

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    this.toggleNoItemsMessage();
  }

  /**
   * Handle any user interaction.
   */
  handleUserInteracted() {
    this.wasAnswerGiven = true;
    this.callbacks.onInteracted();

    if (!this.wasCompleted) {
      this.wasCompleted = this.getScore() >= this.getMaxScore();

      if (this.wasCompleted) {
        this.callbacks.onCompleted();
      }
    }
  }

  /**
   * Copy list items to clipboard.
   * @async
   */
  async copyItemsToClipboard() {
    if (!navigator.clipboard) {
      console.warn('Clipboard API not supported');
      return;
    }

    const items = this.itemList.getCurrentState().items;

    const itemsText = items.map((item) => {
      if (item.type === 'checkable') {
        return `${item.checked ? '[x]' : '[ ]'} ${item.text}`;
      }
      else if (item.type === 'segment-title') {
        return `## ${item.text}`;
      }

      return item.text;
    }).join('\n');

    let writingToClipboardWasSuccessful = true;
    try {
      await navigator.clipboard.writeText(itemsText);
    }
    catch (error) {
      writingToClipboardWasSuccessful = false;
    }

    const message = (writingToClipboardWasSuccessful === true) ?
      this.params.dictionary.get('l10n.copyToClipboardSuccess') :
      this.params.dictionary.get('l10n.copyToClipboardError');

    Screenreader.read(message);

    const buttonCopyDOM = this.itemListButtons.getButtonDOM('copy');
    if (!buttonCopyDOM) {
      return;
    }

    H5P.attachToastTo(buttonCopyDOM, message, { position: {
      horizontal: 'centered',
      noOverflowRight: true,
      offsetVertical: TOAST_OFFSET_VERTICAL_PX,
      vertical: 'above',
    } });
  }

  /**
   * Toggle "no items" message visibility.
   * @param {boolean} [showMessageRequested] Whether to show the message.
   */
  toggleNoItemsMessage(showMessageRequested) {
    const showMessage = (typeof showMessageRequested === 'boolean') ?
      showMessageRequested :
      this.itemList.getLength() === 0;

    this.itemList.toggleVisibility(!showMessage);

    this.messageArea.toggleVisibility(showMessage);
    this.messageArea.setMessage(showMessage ? this.params.dictionary.get('l10n.noItemsAvailable') : '');
  }

  /**
   * Check if an answer was given.
   * @returns {boolean} True if user interacted.
   */
  getAnswerGiven() {
    return this.wasAnswerGiven;
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      itemList: this.itemList.getCurrentState(),
    };
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get current score.
   * @returns {number} Score.
   */
  getScore() {
    return this.itemList.getScore();
  }

  /**
   * Get maximum score.
   * @returns {number} Maximum score.
   */
  getMaxScore() {
    return 1;
  }

  /**
   * Reset checklist.
   */
  reset() {
    this.wasAnswerGiven = false;
    this.itemList.reset();
  }

  /**
   * Set drag container for item list.
   * @param {HTMLElement} container Container element.
   */
  setContainer(container) {
    this.itemList.setContainer(container);
  }

  /**
   * Restore state.
   * @param {object} state State to restore.
   * @param {object} state.itemList Item list state.
   */
  setCurrentState(state) {
    this.wasAnswerGiven = true;
    this.itemList.setCurrentState(state.itemList);
    this.toggleNoItemsMessage();
    this.callbacks.onResized();
  }
}
