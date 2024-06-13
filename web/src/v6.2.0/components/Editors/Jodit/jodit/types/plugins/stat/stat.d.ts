/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Plugin } from "../../core/plugin/plugin";
import "./config";
/**
 * Show stat data - words and chars count
 */
export declare class stat extends Plugin {
    private charCounter;
    private wordCounter;
    private reInit;
    /** @override */
    afterInit(): void;
    private calc;
    /** @override */
    beforeDestruct(): void;
}
