import { extend } from '@services/util.js';
import './item-list-buttons.css';

export default class ItemListButtons {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {boolean} params.canAddItems Whether the user can add items.
   * @param {boolean} params.canAddSegmentTitles Whether the user can add segment titles.
   * @param {object} callbacks Callbacks.
   * @param {function} [callbacks.onAddItemRequested] Called when the user requests to add an item.
   * @param {function} [callbacks.onAddSegmentTitleRequested] Called when the user requests to add a segment title.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({
      canAddItems: false,
      canAddSegmentTitles: false,
    }, params);

    this.callbacks = extend({
      onAddItemRequested: () => {},
      onAddSegmentTitleRequested: () => {},
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-checklist-item-list-buttons');
    this.dom.setAttribute('role', 'group');
    this.dom.setAttribute('aria-label', this.params.dictionary?.get('a11y.addItemButtons'));

    if (this.params.canAddItems) {
      this.buttonAddItem = new H5P.JoubelUI.createButton({
        class: 'button-add-item h5p-theme-plus',
        html: this.params.dictionary.get('l10n.addCheckboxItem'),
        on: {
          click: () => {
            this.callbacks.onAddItemRequested();
          },
        },
      }).get(0);

      this.dom.appendChild(this.buttonAddItem);
    }

    if (this.params.canAddSegmentTitles) {
      this.buttonAddSegmentTitle = new H5P.JoubelUI.createButton({
        class: 'button-add-segment-title h5p-theme-plus',
        html: this.params.dictionary.get('l10n.addSegmentTitle'),
        on: {
          click: () => {
            this.callbacks.onAddSegmentTitleRequested();
          },
        },
      }).get(0);

      this.dom.appendChild(this.buttonAddSegmentTitle);
    }
  }

  /**
   * Get the DOM element of the item list buttons.
   * @returns {HTMLElement} The item list buttons' DOM element.
   */
  getDOM() {
    return this.dom;
  }
}
