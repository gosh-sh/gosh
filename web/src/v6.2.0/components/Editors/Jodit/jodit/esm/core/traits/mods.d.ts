/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module traits
 */
import type { IComponent, IContainer, IDictionary, IMods, ModType } from "../../types";
export declare abstract class Mods implements IMods {
    abstract mods: IDictionary;
    afterSetMod(name: string, value: ModType): void;
    /**
     * Set/remove BEM class modification
     *
     * @param value - if null, mod will be removed
     */
    setMod<T extends IComponent & IContainer & IMods>(this: T, name: string, value: ModType, container?: HTMLElement): T;
    /**
     * Get BEM class modification value
     */
    getMod(this: IMods, name: string): ModType;
}
