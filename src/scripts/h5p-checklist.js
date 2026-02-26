import Main from '@components/main.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import Dictionary from '@services/dictionary.js';
import { addMixins, extend } from '@services/util.js';
import { getSemanticsDefaults } from '@services/util-h5p.js';
import '@styles/h5p-checklist.css';

/** @constant {string} DEFAULT_LANGUAGE_TAG Default language tag used if not specified in metadata. */
const DEFAULT_LANGUAGE_TAG = 'en';

export default class Checklist extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    try {
      addMixins(Checklist, [QuestionTypeContract, XAPI]);
    }
    catch (error) {
      console.error('Could not apply mixins:', error);
    }

    const defaults = extend({}, getSemanticsDefaults());
    this.params = extend(defaults, params);

    this.contentId = contentId;
    this.extras = extras;

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.previousState = this.extras.previousState || {};

    try {
      this.languageTag = formatLanguageCode(extras?.metadata?.defaultLanguage);
    }
    catch (error) {
      this.languageTag = DEFAULT_LANGUAGE_TAG;
    }

    this.main = new Main(
      {
        ...this.params,
        dictionary: this.dictionary,
      },
      {
        onCompleted: () => {
          this.trigger(this.createXAPIEvent('completed'));
        },
        onInteracted: () => {
          this.trigger(this.createXAPIEvent('interacted'));
        },
        onResized: () => {
          this.trigger('resize');
        },
      },
    );

    if (Object.keys(this.previousState).length) {
      this.setCurrentState(this.previousState);
    }
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    const wrapper = $wrapper.get(0);
    wrapper.classList.add('h5p-checklist');
    wrapper.appendChild(this.main.getDOM());

    this.main.setContainer(wrapper);
  }
}
