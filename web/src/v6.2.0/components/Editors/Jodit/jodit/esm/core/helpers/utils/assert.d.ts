/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/** Asserts that condition is truthy (or evaluates to true). */
declare function assert<T>(condition: T | false | 0 | '' | null | undefined, message: string): asserts condition;
export { assert };
