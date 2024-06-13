/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/decorators/component/README.md]]
 * @packageDocumentation
 * @module decorators/component
 */
interface ComponentCompatible {
    new (...constructorArgs: any[]): any;
}
/**
 * Decorate components and set status isReady after constructor
 * @param constructorFunction - Component constructor class
 */
export declare function component<T extends ComponentCompatible>(constructorFunction: T): T;
export {};
