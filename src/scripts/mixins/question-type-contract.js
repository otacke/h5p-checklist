/**
 * Mixin containing methods for H5P Question Type contract.
 */
export default class QuestionTypeContract {
  /**
   * Determine whether the task was answered already.
   * @returns {boolean} True if answer was given by user, else false.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.main.getAnswerGiven();
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    return this.main.getScore();
  }

  /**
   * Get maximum possible score.
   * @returns {number} Maximum possible score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    return this.main.getMaxScore();
  }

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    // Intentionally left blank
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.contentWasReset = true;

    this.main.reset();

    if (this.isRoot()) {
      this.setActivityStarted();
    }
  }

  /**
   * Get xAPI data.
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    const xAPIEvent = this.createXAPIEvent('completed');

    return { statement: xAPIEvent.data.statement };
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-7}
   */
  getCurrentState() {
    if (!this.main) {
      return {};
    }

    if (!this.getAnswerGiven()) {
      return this.contentWasReset ? {} : undefined;
    }

    return this.main.getCurrentState();
  }

  /**
   * Set current state as counterpart to getCurrentState.
   * @param {object} state State to be restored.
   */
  setCurrentState(state) {
    this.resetTask();
    this.main.setCurrentState(this.sanitizeState(state));
  }

  /**
   * Sanitize state object to only contain valid data.
   * @param {object} state State to sanitize.
   * @returns {object} Sanitized state.
   */
  sanitizeState(state = {}) {
    const sanitizedState = {
      itemList: {
        items: [],
      },
    };

    if (!state.itemList || typeof state.itemList !== 'object' || state.itemList === null) {
      return sanitizedState;
    }

    if (!state.itemList.items || !Array.isArray(state.itemList.items)) {
      return sanitizedState;
    }

    sanitizedState.itemList.items = state.itemList.items
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => {
        const sanitizedItem = {
          text: typeof item.text === 'string' ? item.text : this.dictionary.get('l10n.newItem'),
          type: item.type === 'segment-title' ? 'segment-title' : 'checkable',
          canBeMoved: Boolean(item.canBeMoved),
          canBeRemoved: Boolean(item.canBeRemoved),
          canBeEdited: Boolean(item.canBeEdited),
        };

        if (sanitizedItem.type === 'checkable') {
          sanitizedItem.checked = Boolean(item.checked);
          sanitizedItem.canBeUnchecked = Boolean(item.canBeUnchecked);
        }

        return sanitizedItem;
      });

    return sanitizedState;
  }
}
