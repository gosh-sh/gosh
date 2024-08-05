/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/ui/form/README.md]]
 * @packageDocumentation
 * @module ui/form
 */
import type { IDictionary, IUIForm } from "../../../types";
import { UIGroup } from "../group/group";
export declare class UIForm extends UIGroup implements IUIForm {
    /** @override */
    className(): string;
    container: HTMLFormElement;
    submit(): void;
    validate(): boolean;
    onSubmit(handler: (data: IDictionary) => false | void): this;
    /** @override */
    protected createContainer(): HTMLElement;
    constructor(...args: ConstructorParameters<typeof UIGroup>);
}
