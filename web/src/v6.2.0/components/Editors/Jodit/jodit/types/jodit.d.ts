/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:README.md]]
 * @packageDocumentation
 * @module jodit
 */
import type { AjaxOptions, CanPromise, CustomCommand, ICreate, IDictionary, IFileBrowser, IHistory, IJodit, IMessages, IPluginSystem, IResponse, IStatusBar, IUploader, IWorkPlace, Modes } from "./types";
import type * as Modules from "./modules";
import * as constants from "./core/constants";
import { Dlgs } from "./core/traits/dlgs";
import { Selection, ViewWithToolbar } from "./modules";
import { Config } from "./config";
/**
 * Class Jodit. Main class
 */
export interface Jodit extends Dlgs {
}
export declare class Jodit extends ViewWithToolbar implements IJodit, Dlgs {
    /** @override */
    className(): string;
    /**
     * Return promise for ready actions
     * @example
     * ```js
     * const jodit = Jodit.make('#editor');
     * await jodit.waitForReady();
     * jodit.e.fire('someAsyncLoadedPluginEvent', (test) => {
     *   alert(test);
     * });
     * ```
     */
    waitForReady(): Promise<IJodit>;
    static get ready(): Promise<IJodit>;
    /**
     * Define if object is Jodit
     */
    readonly isJodit: true;
    /**
     * Plain text editor's value
     */
    get text(): string;
    /**
     * Return a default timeout period in milliseconds for some debounce or throttle functions.
     * By default, `{history.timeout}` options
     */
    get defaultTimeout(): number;
    /**
     * Method wrap usual Has Object in Object helper for prevent deep object merging in options*
     */
    static atom<T>(object: T): T;
    /**
     * Factory for creating Jodit instance
     */
    static make(element: HTMLElement | string, options?: object): Jodit;
    /**
     * Checks if the element has already been initialized when for Jodit
     */
    static isJoditAssigned(element: HTMLElement): element is HTMLElement & {
        component: Jodit;
    };
    /**
     * Default settings
     */
    static get defaultOptions(): Config;
    static fatMode: boolean;
    static readonly plugins: IPluginSystem;
    static modules: typeof Modules;
    static ns: typeof Modules;
    static readonly decorators: IDictionary<Function>;
    static readonly constants: typeof constants;
    static readonly instances: IDictionary<IJodit>;
    static readonly lang: any;
    static readonly core: {
        Plugin: typeof Modules.Plugin;
    };
    private readonly commands;
    private __selectionLocked;
    private __wasReadOnly;
    get createInside(): ICreate;
    /**
     * Editor has focus in this time
     */
    editorIsActive: boolean;
    private __setPlaceField;
    /**
     * element It contains source element
     */
    get element(): HTMLElement;
    /**
     * editor It contains the root element editor
     */
    get editor(): HTMLDivElement | HTMLBodyElement;
    set editor(editor: HTMLDivElement | HTMLBodyElement);
    /**
     * Container for all staff
     */
    get container(): HTMLDivElement;
    set container(container: HTMLDivElement);
    /**
     * workplace It contains source and wysiwyg editors
     */
    get workplace(): HTMLDivElement;
    get message(): IMessages;
    /**
     * Statusbar module
     */
    get statusbar(): IStatusBar;
    /**
     * iframe Iframe for iframe mode
     */
    get iframe(): HTMLIFrameElement | void;
    set iframe(iframe: HTMLIFrameElement | void);
    get history(): IHistory;
    /**
     * In iframe mode editor's window can be different by owner
     */
    get editorWindow(): Window;
    set editorWindow(win: Window);
    /**
     * Alias for this.ew
     */
    get ew(): this['editorWindow'];
    /**
     * In iframe mode editor's window can be different by owner
     */
    get editorDocument(): Document;
    /**
     * Alias for this.ew
     */
    get ed(): this['editorDocument'];
    /**
     * options All Jodit settings default + second arguments of constructor
     */
    get options(): Config;
    set options(opt: Config);
    readonly selection: Selection;
    /**
     * Alias for this.selection
     */
    get s(): this['selection'];
    get uploader(): IUploader;
    get filebrowser(): IFileBrowser;
    private __mode;
    /**
     * Editor's mode
     */
    get mode(): Modes;
    set mode(mode: Modes);
    /**
     * Return real HTML value from WYSIWYG editor.
     * @internal
     */
    getNativeEditorValue(): string;
    /**
     * Set value to native editor
     */
    setNativeEditorValue(value: string): void;
    /**
     * HTML value
     */
    get value(): string;
    set value(html: string);
    synchronizeValues(): void;
    /**
     * This is an internal method, do not use it in your applications.
     * @private
     * @internal
     */
    __imdSynchronizeValues(): void;
    /**
     * Return editor value
     */
    getEditorValue(removeSelectionMarkers?: boolean, consumer?: string): string;
    private __callChangeCount;
    /**
     * Set editor html value and if set sync fill source element value
     * When method was called without arguments - it is a simple way to synchronize editor to element
     */
    setEditorValue(value?: string): void;
    /**
     * If some plugin changes the DOM directly, then you need to update the content of the original element
     */
    protected updateElementValue(): void;
    /**
     * Return source element value
     */
    getElementValue(): string;
    private __setElementValue;
    /**
     * Register custom handler for command
     *
     * @example
     * ```javascript
     * var jodit = Jodit.make('#editor);
     *
     * jodit.setEditorValue('test test test');
     *
     * jodit.registerCommand('replaceString', function (command, needle, replace) {
     *      var value = this.getEditorValue();
     *      this.setEditorValue(value.replace(needle, replace));
     *      return false; // stop execute native command
     * });
     *
     * jodit.execCommand('replaceString', 'test', 'stop');
     *
     * console.log(jodit.value); // stop test
     *
     * // and you can add hotkeys for command
     * jodit.registerCommand('replaceString', {
     *    hotkeys: 'ctrl+r',
     *    exec: function (command, needle, replace) {
     *     var value = this.getEditorValue();
     *     this.setEditorValue(value.replace(needle, replace));
     *    }
     * });
     *
     * ```
     */
    registerCommand<C extends string>(commandNameOriginal: C, command: CustomCommand<IJodit, C>, options?: {
        stopPropagation: boolean;
    }): IJodit;
    /**
     * Register hotkey for command
     */
    registerHotkeyToCommand(hotkeys: string | string[], commandName: string, shouldStop?: boolean): void;
    /**
     * Execute command editor
     *
     * @param command - command. It supports all the
     * @see https://developer.mozilla.org/ru/docs/Web/API/Document/execCommand#commands and a number of its own
     * for example applyStyleProperty. Comand fontSize receives the second parameter px,
     * formatBlock and can take several options
     * @example
     * ```javascript
     * this.execCommand('fontSize', 12); // sets the size of 12 px
     * this.execCommand('underline');
     * this.execCommand('formatBlock', 'p'); // will be inserted paragraph
     * ```
     */
    execCommand(command: string, showUI?: boolean, value?: null | any, ...args: unknown[]): void;
    /**
     * Don't raise a change event
     */
    private __isSilentChange;
    /**
     * Exec native command
     */
    nativeExecCommand(command: string, showUI?: boolean, value?: null | any): boolean;
    private __execCustomCommands;
    /**
     * Disable selecting
     */
    lock(name?: string): boolean;
    /**
     * Enable selecting
     */
    unlock(): boolean;
    /**
     * Return current editor mode: Jodit.MODE_WYSIWYG, Jodit.MODE_SOURCE or Jodit.MODE_SPLIT
     */
    getMode(): Modes;
    isEditorMode(): boolean;
    /**
     * Return current real work mode. When editor in MODE_SOURCE or MODE_WYSIWYG it will
     * return them, but then editor in MODE_SPLIT it will return MODE_SOURCE if
     * Textarea(CodeMirror) focused or MODE_WYSIWYG otherwise
     *
     * @example
     * ```javascript
     * var editor = Jodit.make('#editor');
     * console.log(editor.getRealMode());
     * ```
     */
    getRealMode(): Modes;
    /**
     * Set current mode
     */
    setMode(mode: number | string): void;
    /**
     * Toggle editor mode WYSIWYG to TEXTAREA(CodeMirror) to SPLIT(WYSIWYG and TEXTAREA) to again WYSIWYG
     *
     * @example
     * ```javascript
     * var editor = Jodit.make('#editor');
     * editor.toggleMode();
     * ```
     */
    toggleMode(): void;
    /**
     * Switch on/off the editor into the disabled state.
     * When disabled, the user is not able to change the editor content
     * This function firing the `disabled` event.
     */
    setDisabled(isDisabled: boolean): void;
    /**
     * Return true if editor in disabled mode
     */
    getDisabled(): boolean;
    /**
     * Switch on/off the editor into the read-only state.
     * When in readonly, the user is not able to change the editor content, but can still
     * use some editor functions (show source code, print content, or seach).
     * This function firing the `readonly` event.
     */
    setReadOnly(isReadOnly: boolean): void;
    /**
     * Return true if editor in read-only mode
     */
    getReadOnly(): boolean;
    focus(): void;
    get isFocused(): boolean;
    /**
     * Hook before init
     */
    protected beforeInitHook(): CanPromise<void>;
    /**
     * Hook after init
     */
    protected afterInitHook(): CanPromise<void>;
    /** @override **/
    protected initOptions(options?: object): void;
    /** @override **/
    protected initOwners(): void;
    /**
     * Create instance of Jodit
     *
     * @param element - Selector or HTMLElement
     * @param options - Editor's options
     */
    protected constructor(element: HTMLElement | string, options?: object);
    currentPlace: IWorkPlace;
    places: IWorkPlace[];
    private readonly __elementToPlace;
    /**
     * Create and init current editable place
     */
    addPlace(source: HTMLElement | string, options?: object): void | Promise<any>;
    protected addDisclaimer(elm: HTMLElement): void;
    /**
     * Set current place object
     */
    setCurrentPlace(place: IWorkPlace): void;
    private __initEditor;
    /**
     * Create main DIV element and replace source textarea
     */
    private __createEditor;
    /**
     * Attach some native event listeners
     */
    private __prepareWYSIWYGEditor;
    fetch<Response extends object = any>(url: string, options?: Partial<AjaxOptions>): Promise<IResponse<Response>>;
    /**
     * Jodit's Destructor. Remove editor, and return source input
     */
    destruct(): void;
}
