/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_PROD } from "../../../constants.js";
import { isString } from "../../../helpers/checker/is-string.js";
import { assert } from "../../../helpers/utils/assert.js";
/**
 * A state machine implementation for applying styles.
 */
export class FiniteStateMachine {
    setState(state) {
        assert(!this.__previewsStates.has(state), 'Circled states');
        this.__previewsStates.add(state);
        this.__state = state;
    }
    getState() {
        return this.__state;
    }
    disableSilent() {
        this.silent = false;
    }
    constructor(state, transitions) {
        this.transitions = transitions;
        this.silent = true;
        this.__previewsStates = new Set();
        this.setState(state);
    }
    dispatch(actionName, value) {
        const action = this.transitions[this.getState()][actionName];
        if (action) {
            const res = action.call(this, value);
            assert(res && res !== value, 'Action should return new value');
            assert(isString(res.next), 'Value should contain the next state');
            assert(res.next !== this.getState(), 'The new state should not be equal to the old one.');
            this.setState(res.next);
            if (!IS_PROD && !this.silent) {
                // eslint-disable-next-line no-console
                console.log(`State: ${this.getState()}`);
            }
            return res;
        }
        throw new Error(`invalid action: ${this.getState()}.${actionName.toString()}`);
    }
}
