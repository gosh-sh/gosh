/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/delete/README.md]]
 * @packageDocumentation
 * @module plugins/delete
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./interface";
export declare class deleteCommand extends Plugin {
    static requires: string[];
    protected afterInit(jodit: IJodit): void;
    protected beforeDestruct(jodit: IJodit): void;
    /**
     * After Delete command remove extra BR
     */
    private __afterDeleteCommand;
    private __onDeleteCommand;
    private __moveContentInLeftSibling;
    /**
     * If left sibling is list - return last leaf
     */
    private __defineRightLeftBox;
    /**
     * Add BR in empty blocks left and right(for table cell)
     */
    private __addBrInEmptyBlock;
    private __moveCursorInEditableSibling;
}
