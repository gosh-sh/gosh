/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isVoid } from "../helpers/checker/is-void.js";
export class Mods {
    afterSetMod(name, value) { }
    /**
     * Set/remove BEM class modification
     *
     * @param value - if null, mod will be removed
     */
    setMod(name, value, container) {
        name = name.toLowerCase();
        const oldValue = this.mods[name];
        if (oldValue === value) {
            return this;
        }
        const mod = `${this.componentName}_${name}_`, cl = (container || this.container).classList;
        if (oldValue != null) {
            cl.remove(`${mod}${oldValue.toString().toLowerCase()}`);
        }
        !isVoid(value) &&
            value !== '' &&
            cl.add(`${mod}${value.toString().toLowerCase()}`);
        this.mods[name] = value;
        this.afterSetMod(name, value);
        return this;
    }
    /**
     * Get BEM class modification value
     */
    getMod(name) {
        return this.mods[name] ?? null;
    }
}
