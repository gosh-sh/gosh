/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Jodit_1;
import * as constants from "./core/constants.js";
import { FAT_MODE, IS_PROD, lang } from "./core/constants.js";
import { autobind, cache, derive, throttle, watch } from "./core/decorators/index.js";
import { eventEmitter, instances, modules, pluginSystem } from "./core/global.js";
import { asArray, attr, callPromise, ConfigProto, css, error, isFunction, isJoditObject, isNumber, isPromise, isString, isVoid, kebabCase, markAsAtomic, normalizeKeyAliases, resolveElement, toArray, ucfirst } from "./core/helpers/index.js";
import { Ajax } from "./core/request/index.js";
import { Dlgs } from "./core/traits/dlgs.js";
import { Create, Dom, History, Plugin, Selection, StatusBar, STATUSES, ViewWithToolbar } from "./modules/index.js";
import { Config } from "./config.js";
const __defaultStyleDisplayKey = 'data-jodit-default-style-display';
const __defaultClassesKey = 'data-jodit-default-classes';
let Jodit = Jodit_1 = class Jodit extends ViewWithToolbar {
    /** @override */
    className() {
        return 'Jodit';
    }
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
    waitForReady() {
        if (this.isReady) {
            return Promise.resolve(this);
        }
        return this.async.promise(resolve => {
            this.hookStatus('ready', () => resolve(this));
        });
    }
    static get ready() {
        return new Promise(resolve => {
            eventEmitter.on('oditready', resolve);
        });
    }
    /**
     * Plain text editor's value
     */
    get text() {
        if (this.editor) {
            return this.editor.innerText || '';
        }
        const div = this.createInside.div();
        div.innerHTML = this.getElementValue();
        return div.innerText || '';
    }
    /**
     * Return a default timeout period in milliseconds for some debounce or throttle functions.
     * By default, `{history.timeout}` options
     */
    get defaultTimeout() {
        return isNumber(this.o.defaultTimeout)
            ? this.o.defaultTimeout
            : Config.defaultOptions.defaultTimeout;
    }
    /**
     * Method wrap usual Has Object in Object helper for prevent deep object merging in options*
     */
    static atom(object) {
        return markAsAtomic(object);
    }
    /**
     * Factory for creating Jodit instance
     */
    static make(element, options) {
        return new this(element, options);
    }
    /**
     * Checks if the element has already been initialized when for Jodit
     */
    static isJoditAssigned(element) {
        return (element &&
            isJoditObject(element.component) &&
            !element.component.isInDestruct);
    }
    /**
     * Default settings
     */
    static get defaultOptions() {
        return Config.defaultOptions;
    }
    get createInside() {
        return new Create(() => this.ed, this.o.createAttributes);
    }
    __setPlaceField(field, value) {
        if (!this.currentPlace) {
            this.currentPlace = {};
            this.places = [this.currentPlace];
        }
        this.currentPlace[field] = value;
    }
    /**
     * element It contains source element
     */
    get element() {
        return this.currentPlace.element;
    }
    /**
     * editor It contains the root element editor
     */
    get editor() {
        return this.currentPlace.editor;
    }
    set editor(editor) {
        this.__setPlaceField('editor', editor);
    }
    /**
     * Container for all staff
     */
    get container() {
        return this.currentPlace.container;
    }
    set container(container) {
        this.__setPlaceField('container', container);
    }
    /**
     * workplace It contains source and wysiwyg editors
     */
    get workplace() {
        return this.currentPlace.workplace;
    }
    get message() {
        return this.getMessageModule(this.workplace);
    }
    /**
     * Statusbar module
     */
    get statusbar() {
        return this.currentPlace.statusbar;
    }
    /**
     * iframe Iframe for iframe mode
     */
    get iframe() {
        return this.currentPlace.iframe;
    }
    set iframe(iframe) {
        this.__setPlaceField('iframe', iframe);
    }
    get history() {
        return this.currentPlace.history;
    }
    /**
     * In iframe mode editor's window can be different by owner
     */
    get editorWindow() {
        return this.currentPlace.editorWindow;
    }
    set editorWindow(win) {
        this.__setPlaceField('editorWindow', win);
    }
    /**
     * Alias for this.ew
     */
    get ew() {
        return this.editorWindow;
    }
    /**
     * In iframe mode editor's window can be different by owner
     */
    get editorDocument() {
        return this.currentPlace.editorWindow.document;
    }
    /**
     * Alias for this.ew
     */
    get ed() {
        return this.editorDocument;
    }
    /**
     * options All Jodit settings default + second arguments of constructor
     */
    get options() {
        return this.currentPlace.options;
    }
    set options(opt) {
        this.__setPlaceField('options', opt);
    }
    /**
     * Alias for this.selection
     */
    get s() {
        return this.selection;
    }
    get uploader() {
        return this.getInstance('Uploader', this.o.uploader);
    }
    get filebrowser() {
        const jodit = this;
        const options = ConfigProto({
            defaultTimeout: jodit.defaultTimeout,
            uploader: jodit.o.uploader,
            language: jodit.o.language,
            license: jodit.o.license,
            theme: jodit.o.theme,
            shadowRoot: jodit.o.shadowRoot,
            defaultCallback(data) {
                if (data.files && data.files.length) {
                    data.files.forEach((file, i) => {
                        const url = data.baseurl + file;
                        const isImage = data.isImages
                            ? data.isImages[i]
                            : false;
                        if (isImage) {
                            jodit.s.insertImage(url, null, jodit.o.imageDefaultWidth);
                        }
                        else {
                            jodit.s.insertNode(jodit.createInside.fromHTML(`<a href='${url}' title='${url}'>${url}</a>`));
                        }
                    });
                }
            }
        }, this.o.filebrowser);
        return jodit.getInstance('FileBrowser', options);
    }
    /**
     * Editor's mode
     */
    get mode() {
        return this.__mode;
    }
    set mode(mode) {
        this.setMode(mode);
    }
    /**
     * Return real HTML value from WYSIWYG editor.
     * @internal
     */
    getNativeEditorValue() {
        const value = this.e.fire('beforeGetNativeEditorValue');
        if (isString(value)) {
            return value;
        }
        if (this.editor) {
            return this.editor.innerHTML;
        }
        return this.getElementValue();
    }
    /**
     * Set value to native editor
     */
    setNativeEditorValue(value) {
        const data = {
            value
        };
        if (this.e.fire('beforeSetNativeEditorValue', data)) {
            return;
        }
        if (this.editor) {
            this.editor.innerHTML = data.value;
        }
    }
    /**
     * HTML value
     */
    get value() {
        return this.getEditorValue();
    }
    set value(html) {
        this.setEditorValue(html);
        // @ts-ignore Internal method
        this.history.__processChanges();
    }
    synchronizeValues() {
        this.__imdSynchronizeValues();
    }
    /**
     * This is an internal method, do not use it in your applications.
     * @private
     * @internal
     */
    __imdSynchronizeValues() {
        this.setEditorValue();
    }
    /**
     * Return editor value
     */
    getEditorValue(removeSelectionMarkers = true, consumer) {
        /**
         * Triggered before getEditorValue executed.
         * If returned not undefined, getEditorValue will return this value
         * @example
         * ```javascript
         * var editor = Jodit.make("#redactor");
         * editor.e.on('beforeGetValueFromEditor', function () {
         *     return editor.editor.innerHTML.replace(/a/g, 'b');
         * });
         * ```
         */
        let value;
        value = this.e.fire('beforeGetValueFromEditor', consumer);
        if (value !== undefined) {
            return value;
        }
        value = this.getNativeEditorValue().replace(constants.INVISIBLE_SPACE_REG_EXP(), '');
        if (removeSelectionMarkers) {
            value = value.replace(/<span[^>]+id="jodit-selection_marker_[^>]+><\/span>/g, '');
        }
        if (value === '<br>') {
            value = '';
        }
        /**
         * Triggered after getEditorValue got value from wysiwyg.
         * It can change new_value.value
         *
         * @example
         * ```javascript
         * var editor = Jodit.make("#redactor");
         * editor.e.on('afterGetValueFromEditor', function (new_value) {
         *     new_value.value = new_value.value.replace('a', 'b');
         * });
         * ```
         */
        const new_value = { value };
        this.e.fire('afterGetValueFromEditor', new_value, consumer);
        return new_value.value;
    }
    /**
     * Set editor html value and if set sync fill source element value
     * When method was called without arguments - it is a simple way to synchronize editor to element
     */
    setEditorValue(value) {
        /**
         * Triggered before getEditorValue set value to wysiwyg.
         * @example
         * ```javascript
         * var editor = Jodit.make("#redactor");
         * editor.e.on('beforeSetValueToEditor', function (old_value) {
         *     return old_value.value.replace('a', 'b');
         * });
         * editor.e.on('beforeSetValueToEditor', function () {
         *     return false; // disable setEditorValue method
         * });
         * ```
         */
        const newValue = this.e.fire('beforeSetValueToEditor', value);
        if (newValue === false) {
            return;
        }
        if (isString(newValue)) {
            value = newValue;
        }
        if (!this.editor) {
            if (value !== undefined) {
                this.__setElementValue(value);
            }
            return; // try change value before init or after destruct
        }
        if (!isString(value) && !isVoid(value)) {
            throw error('value must be string');
        }
        if (!isVoid(value) && this.getNativeEditorValue() !== value) {
            this.setNativeEditorValue(value);
        }
        this.e.fire('postProcessSetEditorValue');
        const old_value = this.getElementValue(), new_value = this.getEditorValue();
        if (!this.__isSilentChange &&
            old_value !== new_value &&
            this.__callChangeCount < constants.SAFE_COUNT_CHANGE_CALL) {
            this.__setElementValue(new_value);
            this.__callChangeCount += 1;
            if (!IS_PROD && this.__callChangeCount > 4) {
                console.warn('Too many recursive changes', new_value, old_value);
            }
            try {
                // @ts-ignore Internal method
                this.history.__upTick();
                this.e.fire('change', new_value, old_value);
                this.e.fire(this.history, 'change', new_value, old_value);
            }
            finally {
                this.__callChangeCount = 0;
            }
        }
    }
    /**
     * If some plugin changes the DOM directly, then you need to update the content of the original element
     */
    updateElementValue() {
        this.__setElementValue(this.getEditorValue());
    }
    /**
     * Return source element value
     */
    getElementValue() {
        return this.element.value !== undefined
            ? this.element.value
            : this.element.innerHTML;
    }
    __setElementValue(value) {
        if (!isString(value)) {
            throw error('value must be string');
        }
        if (this.element !== this.container &&
            value !== this.getElementValue()) {
            const data = { value };
            const res = this.e.fire('beforeSetElementValue', data);
            callPromise(res, () => {
                if (this.element.value !== undefined) {
                    this.element.value = data.value;
                }
                else {
                    this.element.innerHTML = data.value;
                }
                this.e.fire('afterSetElementValue', data);
            });
        }
    }
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
    registerCommand(commandNameOriginal, command, options) {
        const commandName = commandNameOriginal.toLowerCase();
        let commands = this.commands.get(commandName);
        if (commands === undefined) {
            commands = [];
            this.commands.set(commandName, commands);
        }
        commands.push(command);
        if (!isFunction(command)) {
            const hotkeys = this.o.commandToHotkeys[commandName] ||
                this.o.commandToHotkeys[commandNameOriginal] ||
                command.hotkeys;
            if (hotkeys) {
                this.registerHotkeyToCommand(hotkeys, commandName, options?.stopPropagation);
            }
        }
        return this;
    }
    /**
     * Register hotkey for command
     */
    registerHotkeyToCommand(hotkeys, commandName, shouldStop = true) {
        const shortcuts = asArray(hotkeys)
            .map(normalizeKeyAliases)
            .map(hotkey => hotkey + '.hotkey')
            .join(' ');
        this.e
            .off(shortcuts)
            .on(shortcuts, (type, stop) => {
            if (stop) {
                stop.shouldStop = shouldStop ?? true;
            }
            return this.execCommand(commandName); // because need `beforeCommand`
        });
    }
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
    execCommand(command, showUI, value, ...args) {
        if (!this.s.isFocused()) {
            this.s.focus();
        }
        if (this.o.readonly &&
            !this.o.allowCommandsInReadOnly.includes(command)) {
            return;
        }
        let result;
        command = command.toLowerCase();
        /**
         * Called before any command
         * @param command - Command name in lowercase
         * @param second - The second parameter for the command
         * @param third - The third option is for the team
         * @example
         * ```javascript
         * parent.e.on('beforeCommand', function (command) {
         *  if (command === 'justifyCenter') {
         *      var p = parent.c.element('p')
         *      parent.s.insertNode(p)
         *      parent.s.setCursorIn(p);
         *      p.style.textAlign = 'justyfy';
         *      return false; // break executes native command
         *  }
         * })
         * ```
         */
        result = this.e.fire(`beforeCommand${ucfirst(command)}`, showUI, value, ...args);
        if (result !== false) {
            result = this.e.fire('beforeCommand', command, showUI, value, ...args);
        }
        if (result !== false) {
            result = this.__execCustomCommands(command, showUI, value, ...args);
        }
        if (result !== false) {
            this.s.focus();
            try {
                result = this.nativeExecCommand(command, showUI, value);
            }
            catch (e) {
                if (!IS_PROD) {
                    throw e;
                }
            }
        }
        /**
         * It called after any command
         * @param command - name command
         * @param second - The second parameter for the command
         * @param third - The third option is for the team
         */
        this.e.fire('afterCommand', command, showUI, value);
        this.__imdSynchronizeValues(); // synchrony
        return result;
    }
    /**
     * Exec native command
     */
    nativeExecCommand(command, showUI, value) {
        this.__isSilentChange = true;
        try {
            return this.ed.execCommand(command, showUI, value);
        }
        finally {
            this.__isSilentChange = false;
        }
    }
    __execCustomCommands(commandName, second, third, ...args) {
        commandName = commandName.toLowerCase();
        const commands = this.commands.get(commandName);
        if (commands !== undefined) {
            let result;
            commands.forEach((command) => {
                let callback;
                if (isFunction(command)) {
                    callback = command;
                }
                else {
                    callback = command.exec;
                }
                const resultCurrent = callback.call(this, commandName, second, third, ...args);
                if (resultCurrent !== undefined) {
                    result = resultCurrent;
                }
            });
            return result;
        }
    }
    /**
     * Disable selecting
     */
    lock(name = 'any') {
        if (super.lock(name)) {
            this.__selectionLocked = this.s.save();
            this.s.clear();
            this.editor.classList.add('jodit_lock');
            this.e.fire('lock', true);
            return true;
        }
        return false;
    }
    /**
     * Enable selecting
     */
    unlock() {
        if (super.unlock()) {
            this.editor.classList.remove('jodit_lock');
            if (this.__selectionLocked) {
                this.s.restore();
            }
            this.e.fire('lock', false);
            return true;
        }
        return false;
    }
    /**
     * Return current editor mode: Jodit.MODE_WYSIWYG, Jodit.MODE_SOURCE or Jodit.MODE_SPLIT
     */
    getMode() {
        return this.mode;
    }
    isEditorMode() {
        return this.getRealMode() === constants.MODE_WYSIWYG;
    }
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
    getRealMode() {
        if (this.getMode() !== constants.MODE_SPLIT) {
            return this.getMode();
        }
        const active = this.od.activeElement;
        if (active &&
            (active === this.iframe ||
                Dom.isOrContains(this.editor, active) ||
                Dom.isOrContains(this.toolbar.container, active))) {
            return constants.MODE_WYSIWYG;
        }
        return constants.MODE_SOURCE;
    }
    /**
     * Set current mode
     */
    setMode(mode) {
        const oldMode = this.getMode();
        const data = {
            mode: parseInt(mode.toString(), 10)
        }, modeClasses = [
            'jodit-wysiwyg_mode',
            'jodit-source__mode',
            'jodit_split_mode'
        ];
        /**
         * Triggered before setMode executed. If returned false method stopped
         * @param data - PlainObject `{mode: {string}}` In handler you can change data.mode
         * @example
         * ```javascript
         * var editor = Jodit.make("#redactor");
         * editor.e.on('beforeSetMode', function (data) {
         *     data.mode = Jodit.MODE_SOURCE; // not respond to the mode change. Always make the source code mode
         * });
         * ```
         */
        if (this.e.fire('beforeSetMode', data) === false) {
            return;
        }
        this.__mode = [
            constants.MODE_SOURCE,
            constants.MODE_WYSIWYG,
            constants.MODE_SPLIT
        ].includes(data.mode)
            ? data.mode
            : constants.MODE_WYSIWYG;
        if (this.o.saveModeInStorage) {
            this.storage.set('jodit_default_mode', this.mode);
        }
        modeClasses.forEach(className => {
            this.container.classList.remove(className);
        });
        this.container.classList.add(modeClasses[this.mode - 1]);
        /**
         * Triggered after setMode executed
         * @example
         * ```javascript
         * var editor = Jodit.make("#redactor");
         * editor.e.on('afterSetMode', function () {
         *     editor.setEditorValue(''); // clear editor's value after change mode
         * });
         * ```
         */
        if (oldMode !== this.getMode()) {
            this.e.fire('afterSetMode');
        }
    }
    /**
     * Toggle editor mode WYSIWYG to TEXTAREA(CodeMirror) to SPLIT(WYSIWYG and TEXTAREA) to again WYSIWYG
     *
     * @example
     * ```javascript
     * var editor = Jodit.make('#editor');
     * editor.toggleMode();
     * ```
     */
    toggleMode() {
        let mode = this.getMode();
        if ([
            constants.MODE_SOURCE,
            constants.MODE_WYSIWYG,
            this.o.useSplitMode ? constants.MODE_SPLIT : 9
        ].includes(mode + 1)) {
            mode += 1;
        }
        else {
            mode = constants.MODE_WYSIWYG;
        }
        this.setMode(mode);
    }
    /**
     * Switch on/off the editor into the disabled state.
     * When disabled, the user is not able to change the editor content
     * This function firing the `disabled` event.
     */
    setDisabled(isDisabled) {
        this.o.disabled = isDisabled;
        const readOnly = this.__wasReadOnly;
        this.setReadOnly(isDisabled || readOnly);
        this.__wasReadOnly = readOnly;
        if (this.editor) {
            this.editor.setAttribute('aria-disabled', isDisabled.toString());
            this.container.classList.toggle('jodit_disabled', isDisabled);
            this.e.fire('disabled', isDisabled);
        }
    }
    /**
     * Return true if editor in disabled mode
     */
    getDisabled() {
        return this.o.disabled;
    }
    /**
     * Switch on/off the editor into the read-only state.
     * When in readonly, the user is not able to change the editor content, but can still
     * use some editor functions (show source code, print content, or seach).
     * This function firing the `readonly` event.
     */
    setReadOnly(isReadOnly) {
        if (this.__wasReadOnly === isReadOnly) {
            return;
        }
        this.__wasReadOnly = isReadOnly;
        this.o.readonly = isReadOnly;
        if (isReadOnly) {
            this.editor && this.editor.removeAttribute('contenteditable');
        }
        else {
            this.editor && this.editor.setAttribute('contenteditable', 'true');
        }
        this.e && this.e.fire('readonly', isReadOnly);
    }
    /**
     * Return true if editor in read-only mode
     */
    getReadOnly() {
        return this.o.readonly;
    }
    focus() {
        if (this.getMode() !== constants.MODE_SOURCE) {
            this.s.focus();
        }
    }
    get isFocused() {
        return this.s.isFocused();
    }
    /**
     * Hook before init
     */
    beforeInitHook() {
        // do nothing
    }
    /**
     * Hook after init
     */
    afterInitHook() {
        // do nothing
    }
    /** @override **/
    initOptions(options) {
        this.options = (ConfigProto(options || {}, Config.defaultOptions));
    }
    /** @override **/
    initOwners() {
        // in iframe, it can be changed
        this.editorWindow = this.o.ownerWindow;
        this.ownerWindow = this.o.ownerWindow;
    }
    /**
     * Create instance of Jodit
     *
     * @param element - Selector or HTMLElement
     * @param options - Editor's options
     */
    constructor(element, options) {
        super(options, true);
        /**
         * Define if object is Jodit
         */
        this.isJodit = true;
        this.commands = new Map();
        this.__selectionLocked = null;
        this.__wasReadOnly = false;
        /**
         * Editor has focus in this time
         */
        this.editorIsActive = false;
        this.__mode = constants.MODE_WYSIWYG;
        this.__callChangeCount = 0;
        /**
         * Don't raise a change event
         */
        this.__isSilentChange = false;
        this.__elementToPlace = new Map();
        try {
            const elementSource = resolveElement(element, this.o.shadowRoot || this.od);
            if (Jodit_1.isJoditAssigned(elementSource)) {
                // @ts-ignore
                return elementSource.component;
            }
        }
        catch (e) {
            this.destruct();
            throw e;
        }
        this.setStatus(STATUSES.beforeInit);
        this.id =
            attr(resolveElement(element, this.o.shadowRoot || this.od), 'id') ||
                new Date().getTime().toString();
        instances[this.id] = this;
        this.attachEvents(options);
        this.e.on(this.ow, 'resize', () => {
            if (this.e) {
                this.e.fire('resize');
            }
        });
        this.e.on('prepareWYSIWYGEditor', this.__prepareWYSIWYGEditor);
        this.selection = new Selection(this);
        const beforeInitHookResult = this.beforeInitHook();
        callPromise(beforeInitHookResult, () => {
            if (this.isInDestruct) {
                return;
            }
            this.e.fire('beforeInit', this);
            pluginSystem.__init(this);
            this.e.fire('afterPluginSystemInit', this);
            this.e.on('changePlace', () => {
                this.setReadOnly(this.o.readonly);
                this.setDisabled(this.o.disabled);
            });
            this.places.length = 0;
            const addPlaceResult = this.addPlace(element, options);
            instances[this.id] = this;
            const init = () => {
                if (this.isInDestruct) {
                    return;
                }
                if (this.e) {
                    this.e.fire('afterInit', this);
                }
                callPromise(this.afterInitHook());
                this.setStatus(STATUSES.ready);
                this.e.fire('afterConstructor', this);
            };
            callPromise(addPlaceResult, init);
        });
    }
    /**
     * Create and init current editable place
     */
    addPlace(source, options) {
        const element = resolveElement(source, this.o.shadowRoot || this.od);
        this.attachEvents(options);
        if (element.attributes) {
            toArray(element.attributes).forEach((attr) => {
                const name = attr.name;
                let value = attr.value;
                if (Config.defaultOptions[name] !== undefined &&
                    (!options || options[name] === undefined)) {
                    if (['readonly', 'disabled'].indexOf(name) !== -1) {
                        value = value === '' || value === 'true';
                    }
                    if (/^[0-9]+(\.)?([0-9]+)?$/.test(value.toString())) {
                        value = Number(value);
                    }
                    this.options[name] = value;
                }
            });
        }
        let container = this.c.div('jodit-container');
        container.classList.add('jodit');
        container.classList.add('jodit-container');
        container.classList.add(`jodit_theme_${this.o.theme || 'default'}`);
        addClassNames(this.o.className, container);
        if (this.o.containerStyle) {
            css(container, this.o.containerStyle);
        }
        const { styleValues } = this.o;
        Object.keys(styleValues).forEach(key => {
            const property = kebabCase(key);
            container.style.setProperty(`--jd-${property}`, styleValues[key]);
        });
        container.setAttribute('contenteditable', 'false');
        let buffer = null;
        if (this.o.inline) {
            if (['TEXTAREA', 'INPUT'].indexOf(element.nodeName) === -1) {
                container = element;
                element.setAttribute(__defaultClassesKey, element.className.toString());
                buffer = container.innerHTML;
                container.innerHTML = '';
            }
            container.classList.add('jodit_inline');
            container.classList.add('jodit-container');
        }
        // actual for inline mode
        if (element !== container) {
            // hide source element
            if (element.style.display) {
                element.setAttribute(__defaultStyleDisplayKey, element.style.display);
            }
            element.style.display = 'none';
        }
        const workplace = this.c.div('jodit-workplace', {
            contenteditable: false
        });
        container.appendChild(workplace);
        if (element.parentNode && element !== container) {
            element.parentNode.insertBefore(container, element);
        }
        Object.defineProperty(element, 'component', {
            enumerable: false,
            configurable: true,
            value: this
        });
        const editor = this.c.div('jodit-wysiwyg', {
            contenteditable: true,
            'aria-disabled': false,
            tabindex: this.o.tabIndex
        });
        workplace.appendChild(editor);
        const currentPlace = {
            editor,
            element,
            container,
            workplace,
            statusbar: new StatusBar(this, container),
            options: this.isReady
                ? ConfigProto(options || {}, Config.defaultOptions)
                : this.options,
            history: new History(this),
            editorWindow: this.ow
        };
        this.__elementToPlace.set(editor, currentPlace);
        this.setCurrentPlace(currentPlace);
        this.places.push(currentPlace);
        this.setNativeEditorValue(this.getElementValue()); // Init value
        const initResult = this.__initEditor(buffer);
        const opt = this.options;
        const init = () => {
            if (opt.enableDragAndDropFileToEditor &&
                opt.uploader &&
                (opt.uploader.url || opt.uploader.insertImageAsBase64URI)) {
                this.uploader.bind(this.editor);
            }
            // in initEditor - the editor could change
            if (!this.__elementToPlace.get(this.editor)) {
                this.__elementToPlace.set(this.editor, currentPlace);
            }
            this.e.fire('afterAddPlace', currentPlace);
        };
        return callPromise(initResult, init);
    }
    addDisclaimer(elm) {
        this.workplace.appendChild(elm);
    }
    /**
     * Set current place object
     */
    setCurrentPlace(place) {
        if (this.currentPlace === place) {
            return;
        }
        if (!this.isEditorMode()) {
            this.setMode(constants.MODE_WYSIWYG);
        }
        this.currentPlace = place;
        this.buildToolbar();
        if (this.isReady) {
            this.e.fire('changePlace', place);
        }
    }
    __initEditor(buffer) {
        const result = this.__createEditor();
        return callPromise(result, () => {
            if (this.isInDestruct) {
                return;
            }
            // syncro
            if (this.element !== this.container) {
                const value = this.getElementValue();
                if (value !== this.getEditorValue()) {
                    this.setEditorValue(value);
                }
            }
            else {
                buffer != null && this.setEditorValue(buffer); // inline mode
            }
            let mode = this.o.defaultMode;
            if (this.o.saveModeInStorage) {
                const localMode = this.storage.get('jodit_default_mode');
                if (typeof localMode === 'string') {
                    mode = parseInt(localMode, 10);
                }
            }
            this.setMode(mode);
            if (this.o.readonly) {
                this.__wasReadOnly = false;
                this.setReadOnly(true);
            }
            if (this.o.disabled) {
                this.setDisabled(true);
            }
            // if enter plugin isn't installed
            try {
                this.ed.execCommand('defaultParagraphSeparator', false, this.o.enter.toLowerCase());
            }
            catch { }
        });
    }
    /**
     * Create main DIV element and replace source textarea
     */
    __createEditor() {
        const defaultEditorArea = this.editor;
        const stayDefault = this.e.fire('createEditor', this);
        return callPromise(stayDefault, () => {
            if (this.isInDestruct) {
                return;
            }
            if (stayDefault === false || isPromise(stayDefault)) {
                Dom.safeRemove(defaultEditorArea);
            }
            addClassNames(this.o.editorClassName, this.editor);
            if (this.o.style) {
                css(this.editor, this.o.style);
            }
            this.e
                .on('synchro', () => {
                this.setEditorValue();
            })
                .on('focus', () => {
                this.editorIsActive = true;
            })
                .on('blur', () => (this.editorIsActive = false));
            this.__prepareWYSIWYGEditor();
            // direction
            if (this.o.direction) {
                const direction = this.o.direction.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
                this.container.style.direction = direction;
                this.container.setAttribute('dir', direction);
                this.toolbar.setDirection(direction);
            }
            if (this.o.triggerChangeEvent) {
                this.e.on('change', this.async.debounce(() => {
                    this.e && this.e.fire(this.element, 'change');
                }, this.defaultTimeout));
            }
        });
    }
    /**
     * Attach some native event listeners
     */
    __prepareWYSIWYGEditor() {
        const { editor } = this;
        // direction
        if (this.o.direction) {
            const direction = this.o.direction.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
            this.editor.style.direction = direction;
            this.editor.setAttribute('dir', direction);
        }
        // proxy events
        this.e
            .on(editor, 'mousedown touchstart focus', () => {
            const place = this.__elementToPlace.get(editor);
            if (place) {
                this.setCurrentPlace(place);
            }
        })
            .on(editor, 'compositionend', this.synchronizeValues)
            .on(editor, 'selectionchange selectionstart keydown keyup input keypress dblclick mousedown mouseup ' +
            'click copy cut dragstart drop dragover paste resize touchstart touchend focus blur', (event) => {
            if (this.o.readonly || this.__isSilentChange) {
                return;
            }
            const w = this.ew;
            if (event instanceof w.KeyboardEvent &&
                event.isComposing) {
                return;
            }
            if (this.e && this.e.fire) {
                if (this.e.fire(event.type, event) === false) {
                    return false;
                }
                this.synchronizeValues();
            }
        });
    }
    fetch(url, options) {
        const ajax = new Ajax({
            url,
            ...options
        }, this.o.defaultAjaxOptions);
        const destroy = () => {
            this.e.off('beforeDestruct', destroy);
            this.progressbar.progress(100).hide();
            ajax.destruct();
        };
        this.e.one('beforeDestruct', destroy);
        this.progressbar.show().progress(30);
        const promise = ajax.send();
        promise.finally(destroy).catch(() => null);
        return promise;
    }
    /**
     * Jodit's Destructor. Remove editor, and return source input
     */
    destruct() {
        if (this.isInDestruct) {
            return;
        }
        this.setStatus(STATUSES.beforeDestruct);
        this.__elementToPlace.clear();
        this.storage.clear();
        this.buffer.clear();
        this.commands.clear();
        this.__selectionLocked = null;
        this.e.off(this.ow, 'resize');
        this.e.off(this.ow);
        this.e.off(this.od);
        this.e.off(this.od.body);
        const buffer = this.editor ? this.getEditorValue() : '';
        this.places.forEach(({ container, workplace, statusbar, element, iframe, editor, history }) => {
            if (!element) {
                return;
            }
            if (element !== container) {
                if (element.hasAttribute(__defaultStyleDisplayKey)) {
                    const display = attr(element, __defaultStyleDisplayKey);
                    if (display) {
                        element.style.display = display;
                        element.removeAttribute(__defaultStyleDisplayKey);
                    }
                }
                else {
                    element.style.display = '';
                }
            }
            else {
                if (element.hasAttribute(__defaultClassesKey)) {
                    element.className =
                        attr(element, __defaultClassesKey) || '';
                    element.removeAttribute(__defaultClassesKey);
                }
            }
            if (element.hasAttribute('style') && !attr(element, 'style')) {
                element.removeAttribute('style');
            }
            statusbar.destruct();
            this.e.off(container);
            this.e.off(element);
            this.e.off(editor);
            Dom.safeRemove(workplace);
            Dom.safeRemove(editor);
            if (container !== element) {
                Dom.safeRemove(container);
            }
            Object.defineProperty(element, 'component', {
                enumerable: false,
                configurable: true,
                value: null
            });
            Dom.safeRemove(iframe);
            // inline mode
            if (container === element) {
                element.innerHTML = buffer;
            }
            history.destruct();
        });
        this.places.length = 0;
        this.currentPlace = {};
        delete instances[this.id];
        super.destruct();
    }
};
Jodit.fatMode = FAT_MODE;
Jodit.plugins = pluginSystem;
Jodit.modules = modules;
Jodit.ns = modules;
Jodit.decorators = {};
Jodit.constants = constants;
Jodit.instances = instances;
Jodit.lang = lang;
Jodit.core = {
    Plugin
};
__decorate([
    cache
], Jodit.prototype, "createInside", null);
__decorate([
    cache
], Jodit.prototype, "message", null);
__decorate([
    cache
], Jodit.prototype, "s", null);
__decorate([
    cache
], Jodit.prototype, "uploader", null);
__decorate([
    cache
], Jodit.prototype, "filebrowser", null);
__decorate([
    throttle()
], Jodit.prototype, "synchronizeValues", null);
__decorate([
    watch(':internalChange')
], Jodit.prototype, "updateElementValue", null);
__decorate([
    autobind
], Jodit.prototype, "__prepareWYSIWYGEditor", null);
Jodit = Jodit_1 = __decorate([
    derive(Dlgs)
], Jodit);
export { Jodit };
function addClassNames(className, elm) {
    if (className) {
        className.split(/\s+/).forEach(cn => elm.classList.add(cn));
    }
}
