/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { Attributes, ButtonsOption, Controls, IControlType, IDictionary, IExtraPlugin, InsertMode, IUIButtonState, IViewOptions, NodeFunction, Nullable } from "./types";
/**
 * Default Editor's Configuration
 */
declare class Config implements IViewOptions {
    private constructor();
    /**
     * Use cache for heavy methods
     */
    cache: boolean;
    /**
     * Timeout of all asynchronous methods
     */
    defaultTimeout: number;
    namespace: string;
    /**
     * Editor loads completely without plugins. Useful when debugging your own plugin.
     */
    safeMode: boolean;
    /**
     * Editor's width
     *
     * @example
     * ```javascript
     * Jodit.make('.editor', {
     *    width: '100%',
     * })
     * ```
     * @example
     * ```javascript
     * Jodit.make('.editor', {
     *    width: 600, // equivalent for '600px'
     * })
     * ```
     * @example
     * ```javascript
     * Jodit.make('.editor', {
     *    width: 'auto', // autosize
     * })
     * ```
     */
    width: number | string;
    /**
     * Editor's height
     *
     * @example
     * ```javascript
     * Jodit.make('.editor', {
     *    height: '100%',
     * })
     * ```
     * @example
     * ```javascript
     * Jodit.make('.editor', {
     *    height: 600, // equivalent for '600px'
     * })
     * ```
     * @example
     * ```javascript
     * Jodit.make('.editor', {
     *    height: 'auto', // default - autosize
     * })
     * ```
     */
    height: number | string;
    /**
     * List of plugins that will be initialized in safe mode.
     *
     * ```js
     * Jodit.make('#editor', {
     * 	safeMode: true,
     * 	safePluginsList: ['about'],
     * 	extraPlugins: ['yourPluginDev']
     * });
     * ```
     */
    safePluginsList: string[];
    commandToHotkeys: IDictionary<string | string[]>;
    /**
     * Reserved for the paid version of the editor
     */
    license: string;
    /**
     * The name of the preset that will be used to initialize the editor.
     * The list of available presets can be found here Jodit.defaultOptions.presets
     * ```javascript
     * Jodit.make('.editor', {
     * 	preset: 'inline'
     * });
     * ```
     */
    preset: string;
    presets: IDictionary;
    ownerDocument: Document;
    /**
     * Allows you to specify the window in which the editor will be created. Default - window
     * This is necessary if you are creating the editor inside an iframe but the code is running in the parent window
     */
    ownerWindow: Window;
    /**
     * Shadow root if Jodit was created in it
     *
     * ```html
     * <div id="editor"></div>
     * ```
     *
     * ```js
     * const app = document.getElementById('editor');
     * app.attachShadow({ mode: 'open' });
     * const root = app.shadowRoot;
     *
     * root.innerHTML = `
     * <link rel="stylesheet" href="./build/jodit.css"/>
     * <h1>Jodit example in Shadow DOM</h1>
     * <div id="edit"></div>
     * `;
     *
     * const editor = Jodit.make(root.getElementById('edit'), {
     * 	globalFullSize: false,
     * 	shadowRoot: root
     * });
     * editor.value = '<p>start</p>';
     * ```
     */
    shadowRoot: Nullable<ShadowRoot>;
    /**
     * z-index For editor
     */
    zIndex: number;
    /**
     * Change the read-only state of the editor
     */
    readonly: boolean;
    /**
     * Change the disabled state of the editor
     */
    disabled: boolean;
    /**
     * In readOnly mode, some buttons can still be useful, for example, the button to view source code or print
     */
    activeButtonsInReadOnly: string[];
    /**
     * When the editor is in read-only mode, some commands can still be executed:
     * ```javascript
     * const editor = Jodit.make('.editor', {
     * 	 allowCommandsInReadOnly: ['selectall', 'preview', 'print']
     * 	 readonly: true
     * });
     * editor.execCommand('selectall');// will be selected all content
     * editor.execCommand('delete');// but content will not be deleted
     * ```
     */
    allowCommandsInReadOnly: string[];
    /**
     * Size of icons in the toolbar (can be "small", "middle", "large")
     *
     * @example
     * ```javascript
     * const editor = Jodit.make(".dark_editor", {
     *      toolbarButtonSize: "small"
     * });
     * ```
     */
    toolbarButtonSize: IUIButtonState['size'];
    /**
     * Allow navigation in the toolbar of the editor by Tab key
     */
    allowTabNavigation: boolean;
    /**
     * Inline editing mode
     */
    inline: boolean;
    /**
     * Theme (can be "dark")
     * @example
     * ```javascript
     * const editor = Jodit.make(".dark_editor", {
     *      theme: "dark"
     * });
     * ```
     */
    theme: string;
    /**
     * if set true, then the current mode is saved in a cookie, and is restored after a reload of the page
     */
    saveModeInStorage: boolean;
    /**
     * Class name that can be appended to the editable area
     *
     * @see [[Config.iframeCSSLinks]]
     * @see [[Config.iframeStyle]]
     *
     * @example
     * ```javascript
     * Jodit.make('#editor', {
     *    editorClassName: 'some_my_class'
     * });
     * ```
     * ```html
     * <style>
     * .some_my_class p{
     *    line-height: 16px;
     * }
     * </style>
     * ```
     */
    editorClassName: false | string;
    /**
     * Class name that can be appended to the main editor container
     * @example
     * ```javascript
     * const jodit = Jodit.make('#editor', {
     *    className: 'some_my_class'
     * });
     *
     * console.log(jodit.container.classList.contains('some_my_class')); // true
     * ```
     * ```html
     * <style>
     * .some_my_class {
     *    max-width: 600px;
     *    margin: 0 auto;
     * }
     * </style>
     * ```
     */
    className: false | string;
    /**
     * The internal styles of the editable area. They are intended to change
     * not the appearance of the editor, but to change the appearance of the content.
     * @example
     * ```javascript
     * Jodit.make('#editor', {
     * 		style: {
     * 		 font: '12px Arial',
     * 		 color: '#0c0c0c'
     * 		}
     * });
     * ```
     */
    style: false | IDictionary;
    /**
     *
     * @example
     * ```javascript
     * Jodit.make('#editor', {
     * 		editorStyle: {
     * 		 font: '12px Arial',
     * 		 color: '#0c0c0c'
     * 		}
     * });
     * ```
     */
    containerStyle: false | IDictionary;
    /**
     * Dictionary of variable values in css, a complete list can be found here
     * https://github.com/xdan/jodit/blob/main/src/styles/variables.less#L25
     *
     * @example
     * ```js
     * const editor = Jodit.make('#editor', {
     *   styleValues: {
     *		'color-text': 'red',
     *		colorBorder: 'black',
     *		'color-panel': 'blue'
     *   }
     * });
     * ```
     */
    styleValues: IDictionary;
    /**
     * After all, changes in editors for textarea will call change trigger
     *
     * @example
     * ```javascript
     * const editor = Jodit.make('#editor');
     * document.getElementById('editor').addEventListener('change', function () {
     *      console.log(this.value);
     * })
     * ```
     */
    triggerChangeEvent: boolean;
    /**
     * The writing direction of the language which is used to create editor content. Allowed values are: ''
     * (an empty string) – Indicates that content direction will be the same as either the editor UI direction or
     * the page element direction. 'ltr' – Indicates a Left-To-Right text direction (like in English).
     * 'rtl' – Indicates a Right-To-Left text direction (like in Arabic).
     *
     * @example
     * ```javascript
     * Jodit.make('.editor', {
     *    direction: 'rtl'
     * })
     * ```
     */
    direction: 'rtl' | 'ltr' | '';
    /**
     * Language by default. if `auto` language set by document.documentElement.lang ||
     * (navigator.language && navigator.language.substr(0, 2)) ||
     * (navigator.browserLanguage && navigator.browserLanguage.substr(0, 2)) || 'en'
     *
     * @example
     * ```html
     * <!-- include in you page lang file -->
     * <script src="jodit/lang/de.js"></script>
     * <script>
     * var editor = Jodit.make('.editor', {
     *    language: 'de'
     * });
     * </script>
     * ```
     */
    language: string;
    /**
     * if true all Lang.i18n(key) return `{key}`
     *
     * @example
     * ```html
     * <script>
     * var editor = Jodit.make('.editor', {
     *    debugLanguage: true
     * });
     *
     * console.log(editor.i18n("Test")); // {Test}
     * </script>
     * ```
     */
    debugLanguage: boolean;
    /**
     * Collection of language pack data `{en: {'Type something': 'Type something', ...}}`
     *
     * @example
     * ```javascript
     * const editor = Jodit.make('#editor', {
     *     language: 'ru',
     *     i18n: {
     *         ru: {
     *            'Type something': 'Начните что-либо вводить'
     *         }
     *     }
     * });
     * console.log(editor.i18n('Type something')) //Начните что-либо вводить
     * ```
     */
    i18n: IDictionary<IDictionary<string>> | false;
    /**
     * The tabindex global attribute is an integer indicating if the element can take
     * input focus (is focusable), if it should participate to sequential keyboard navigation,
     * and if so, at what position. It can take several values
     */
    tabIndex: number;
    /**
     * Boolean, whether the toolbar should be shown.
     * Alternatively, a valid css-selector-string to use an element as toolbar container.
     */
    toolbar: boolean | string | HTMLElement;
    /**
     * Boolean, whether the statusbar should be shown.
     */
    statusbar: boolean;
    /**
     * Show tooltip after mouse enter on the button
     */
    showTooltip: boolean;
    /**
     * Delay before show tooltip
     */
    showTooltipDelay: number;
    /**
     * Instead of create custop tooltip - use native title tooltips
     */
    useNativeTooltip: boolean;
    /**
     * Default insert method
     * @default insert_as_html
     */
    defaultActionOnPaste: InsertMode;
    /**
     * Element that will be created when you press Enter
     */
    enter: 'p' | 'div' | 'br';
    /**
     * When this option is enabled, the editor's content will be placed in an iframe and isolated from the rest of the page.
     *
     * @example
     * ```javascript
     * Jodit.make('#editor', {
     *    iframe: true,
     *    iframeStyle: 'html{margin: 0px;}body{padding:10px;background:transparent;color:#000;position:relative;z-index:2;\
     *    user-select:auto;margin:0px;overflow:hidden;}body:after{content:"";clear:both;display:block}';
     * });
     * ```
     */
    iframe: boolean;
    /**
     * Allow editing the entire HTML document(html, head)
     * \> Works together with the iframe option.
     * @example
     * ```js
     * const editor = Jodit.make('#editor', {
     *   iframe: true,
     *   editHTMLDocumentMode: true
     * });
     * editor.value = '<!DOCTYPE html><html lang="en" style="overflow-y:hidden">' +
     * 	'<head><title>Jodit Editor</title></head>' +
     * 	'<body spellcheck="false"><p>Some text</p><p> a </p></body>' +
     * 	'</html>';
     * ```
     */
    editHTMLDocumentMode: boolean;
    /**
     * Use when you need to insert new block element
     * use enter option if not set
     */
    enterBlock: 'p' | 'div';
    /**
     * Jodit.MODE_WYSIWYG The HTML editor allows you to write like MSWord,
     * Jodit.MODE_SOURCE syntax highlighting source editor
     * @example
     * ```javascript
     * var editor = Jodit.make('#editor', {
     *     defaultMode: Jodit.MODE_SPLIT
     * });
     * console.log(editor.getRealMode())
     * ```
     */
    defaultMode: number;
    /**
     * Use split mode
     */
    useSplitMode: boolean;
    /**
     * The colors in HEX representation to select a color for the background and for the text in colorpicker
     * @example
     * ```javascript
     *  Jodit.make('#editor', {
     *     colors: ['#ff0000', '#00ff00', '#0000ff']
     * })
     * ```
     */
    colors: IDictionary<string[]> | string[];
    /**
     * The default tab color picker
     * @example
     * ```javascript
     * Jodit.make('#editor2', {
     *     colorPickerDefaultTab: 'color'
     * })
     * ```
     */
    colorPickerDefaultTab: 'background' | 'color';
    /**
     * Image size defaults to a larger image
     */
    imageDefaultWidth: number;
    /**
     * Do not display these buttons that are on the list
     * @example
     * ```javascript
     * Jodit.make('#editor2', {
     *     removeButtons: ['hr', 'source']
     * });
     * ```
     */
    removeButtons: string[];
    /**
     * Do not init these plugins
     * @example
     * ```typescript
     * var editor = Jodit.make('.editor', {
     *    disablePlugins: 'table,iframe'
     * });
     * //or
     * var editor = Jodit.make('.editor', {
     *    disablePlugins: ['table', 'iframe']
     * });
     * ```
     */
    disablePlugins: string[] | string;
    /**
     * Init and download extra plugins
     * @example
     * ```typescript
     * var editor = Jodit.make('.editor', {
     *    extraPlugins: ['emoji']
     * });
     * ```
     * It will try load %SCRIPT_PATH%/plugins/emoji/emoji.js and after load will try init it
     */
    extraPlugins: Array<string | IExtraPlugin>;
    /**
     * Base path for download extra plugins
     */
    basePath?: string;
    /**
     * These buttons list will be added to the option. Buttons
     */
    extraButtons: Array<string | IControlType>;
    /**
     * By default, you can only install an icon from the Jodit suite.
     * You can add your icon to the set using the `Jodit.modules.Icon.set (name, svg Code)` method.
     * But for a declarative declaration, you can use this option.
     *
     * @example
     * ```js
     * Jodit.modules.Icon.set('someIcon', '<svg><path.../></svg>');
     * const editor = Jodit.make({
     *   extraButtons: [{
     *     name: 'someButton',
     *     icon: 'someIcon'
     *   }]
     * });
     *
     * @example
     * const editor = Jodit.make({
     *   extraIcons: {
     *     someIcon: '<svg><path.../></svg>'
     *   },
     *   extraButtons: [{
     *     name: 'someButton',
     *     icon: 'someIcon'
     *   }]
     * });
     * ```
     * @example
     * ```js
     * const editor = Jodit.make({
     *   extraButtons: [{
     *     name: 'someButton',
     *     icon: '<svg><path.../></svg>'
     *   }]
     * });
     * ```
     */
    extraIcons: IDictionary<string>;
    /**
     * Default attributes for created inside editor elements
     * @example
     * ```js
     * const editor2 = Jodit.make('#editor', {
     * 	createAttributes: {
     * 		div: {
     * 			class: 'test'
     * 		},
     * 		ul: function (ul) {
     * 			ul.classList.add('ui-test');
     * 		}
     * 	}
     * });
     *
     * const div2 = editor2.createInside.div();
     * expect(div2.className).equals('test');
     *
     * const ul = editor2.createInside.element('ul');
     * expect(ul.className).equals('ui-test');
     * ```
     * Or JSX in React
     * @example
     * ```jsx
     * import React, {useState, useRef} from 'react';
     * import JoditEditor from "jodit-react";
     *
     * const config = {
     * 	createAttributes: {
     * 		div: {
     * 			class: 'align-center'
     * 		}
     * 	}
     * };
     *
     * <JoditEditor config={config}/>
     * ```
     */
    createAttributes: IDictionary<Attributes | NodeFunction>;
    /**
     * The width of the editor, accepted as the biggest. Used to the responsive version of the editor
     */
    sizeLG: number;
    /**
     * The width of the editor, accepted as the medium. Used to the responsive version of the editor
     */
    sizeMD: number;
    /**
     * The width of the editor, accepted as the small. Used to the responsive version of the editor
     */
    sizeSM: number;
    /**
     * The list of buttons that appear in the editor's toolbar on large places (≥ options.sizeLG).
     * Note - this is not the width of the device, the width of the editor
     * @example
     * ```javascript
     * Jodit.make('#editor', {
     *     buttons: ['bold', 'italic', 'source'],
     *     buttonsMD: ['bold', 'italic'],
     *     buttonsXS: ['bold', 'fullsize'],
     * });
     * ```
     * @example
     * ```javascript
     * Jodit.make('#editor2', {
     *     buttons: [{
     *         name: 'empty',
     *         icon: 'source',
     *         exec: function (editor) {
     *             const dialog = new Jodit.modules.Dialog({}),
     *                 text = editor.c.element('textarea');
     *
     *             dialog.setHeader('Source code');
     *             dialog.setContent(text);
     *             dialog.setSize(400, 300);
     *
     *             Jodit.modules.Helpers.css(elm, {
     *                 width: '100%',
     *                 height: '100%'
     *             })

     *             dialog.open();
     *         }
     *     }]
     * });
     * ```
     * @example
     * ```javascript
     * Jodit.make('#editor2', {
     *     buttons: Jodit.defaultOptions.buttons.concat([{
     *        name: 'listsss',
     *        iconURL: 'stuf/dummy.png',
     *        list: {
     *            h1: 'insert Header 1',
     *            h2: 'insert Header 2',
     *            clear: 'Empty editor',
     *        },
     *        exec: ({originalEvent, control, btn}) => {
     *             var key = control.args[0],
     *                value = control.args[1];
     *             if (key === 'clear') {
     *                 this.val('');
     *                 return;
     *             }
     *             this.s.insertNode(this.c.element(key, ''));
     *             this.message.info('Was inserted ' + value);
     *        },
     *        template: function (key, value) {
     *            return '<div>' + value + '</div>';
     *        }
     *  });
     * ```
     */
    buttons: ButtonsOption;
    /**
     * Behavior for buttons
     */
    controls: Controls;
    /**
     * Some events are called when the editor is initialized, for example, the `afterInit` event.
     * So this code won't work:
     * ```javascript
     * const editor = Jodit.make('#editor');
     * editor.events.on('afterInit', () => console.log('afterInit'));
     * ```
     * You need to do this:
     * ```javascript
     * Jodit.make('#editor', {
     * 		events: {
     * 	  	afterInit: () => console.log('afterInit')
     * 		}
     * });
     * ```
     * The option can use any Jodit events, for example:
     * ```javascript
     * const editor = Jodit.make('#editor', {
     * 		events: {
     * 			hello: (name) => console.log('Hello', name)
     * 		}
     * });
     * editor.e.fire('hello', 'Mike');
     * ```
     */
    events: IDictionary<(...args: any[]) => any>;
    /**
     * Buttons in toolbat without SVG - only texts
     */
    textIcons: boolean;
    /**
     * shows a INPUT[type=color] to open the browser color picker, on the right bottom of widget color picker
     */
    showBrowserColorPicker: boolean;
    private static __defaultOptions;
    static get defaultOptions(): Config;
}
export { Config };
