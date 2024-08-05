/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { toArray } from "../../../core/helpers/array/to-array.js";
/**
 * @private
 */
export function generateCriticalCSS(jodit) {
    const getMatchedCSSRules = (el, css = el.ownerDocument.styleSheets) => {
        const rules = toArray(css)
            .map(s => {
            try {
                return toArray(s.cssRules);
            }
            catch { }
            return [];
        })
            .flat();
        return rules.filter((r) => {
            try {
                return Boolean(r && el.matches(r.selectorText));
            }
            catch { }
            return false;
        });
    };
    class CSSCriticalPath {
        constructor(w, d, opts) {
            this.css = {};
            const opt = opts || {};
            const pushCSS = (r) => {
                const selectorText = r.selectorText
                    .split(',')
                    .map(a => a.trim())
                    .sort()
                    .join(',');
                if (Boolean(this.css[selectorText]) === false) {
                    this.css[selectorText] = {};
                }
                const styles = r.style.cssText.split(/;(?![A-Za-z0-9])/);
                for (let i = 0; i < styles.length; i++) {
                    if (!styles[i]) {
                        continue;
                    }
                    const pair = styles[i].split(':');
                    pair[0] = pair[0].trim();
                    pair[1] = pair[1].trim();
                    this.css[selectorText][pair[0]] = pair[1].replace(/var\(([^)]+)\)/g, (varValue, key) => {
                        const [name, def] = key.split(',');
                        return (jodit.ew
                            .getComputedStyle(jodit.editor)
                            .getPropertyValue(name.trim()) ||
                            def ||
                            varValue).trim();
                    });
                }
            };
            const parseTree = () => {
                // Get a list of all the elements in the view.
                const height = w.innerHeight;
                const walker = d.createTreeWalker(jodit.editor, NodeFilter.SHOW_ELEMENT, () => NodeFilter.FILTER_ACCEPT);
                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    const rect = node.getBoundingClientRect();
                    if (rect.top < height || opt.scanFullPage) {
                        const rules = getMatchedCSSRules(node);
                        if (rules) {
                            for (let r = 0; r < rules.length; r++) {
                                pushCSS(rules[r]);
                            }
                        }
                    }
                }
            };
            parseTree();
        }
        generateCSS() {
            let finalCSS = '';
            for (const k in this.css) {
                if (/:not\(/.test(k)) {
                    continue;
                }
                finalCSS += k + ' { ';
                for (const j in this.css[k]) {
                    finalCSS += j + ': ' + this.css[k][j] + '; ';
                }
                finalCSS += '}\n';
            }
            return finalCSS;
        }
    }
    try {
        const cp = new CSSCriticalPath(jodit.ew, jodit.ed, {
            scanFullPage: true
        });
        return cp.generateCSS();
    }
    catch { }
    return '';
}
