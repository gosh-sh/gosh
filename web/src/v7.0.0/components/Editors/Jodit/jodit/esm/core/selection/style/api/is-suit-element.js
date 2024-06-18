import { Dom } from "../../../dom/dom.js";
import { hasSameStyle, hasSameStyleKeys } from "./has-same-style.js";
import { isNormalNode } from "./is-normal-node.js";
/**
 * Checks if an item is suitable for applying a commit. The element suits us if it
 *  - has the same styles as in the commit (commitStyle.options.style)
 *  - has the same tag as in the commit (commitStyle.options.element)
 *
 * @param commitStyle - style commit
 * @param elm - checked item
 * @param strict - strict mode - false - the default tag is suitable for us if it is also in the commit
 * @param strictStyle - strict style mode - true - the element has the same style keys as in the commit, but not their values
 * @private
 */
export function isSuitElement(commitStyle, elm, strict, strictStyle = true) {
    if (!elm || !isNormalNode(elm)) {
        return false;
    }
    const { element, elementIsDefault, options } = commitStyle;
    if (Dom.isList(elm) && commitStyle.elementIsList) {
        return true;
    }
    const elmIsSame = Dom.isTag(elm, element);
    if (elmIsSame && !(elementIsDefault && strict)) {
        return true;
    }
    const elmHasSameStyle = Boolean(options.attributes?.style &&
        (strictStyle
            ? hasSameStyle(elm, options.attributes.style)
            : hasSameStyleKeys(elm, options.attributes.style)));
    if (elmHasSameStyle && !commitStyle.elementIsList) {
        return true;
    }
    return !elmIsSame && !strict && elementIsDefault && Dom.isInlineBlock(elm);
}
/**
 * @private
 */
export function suitableClosest(commitStyle, element, root) {
    return Dom.closest(element, node => isSuitElement(commitStyle, node, true, false), root);
}
/**
 * Inside the parent element there is a block with the same styles
 * @example
 * For selection:
 * ```html
 * <p>|test<strong>test</strong>|</p>
 * ```
 * Apply `{element:'strong'}`
 * @private
 */
export function isSameStyleChild(commitStyle, elm) {
    const { element, options } = commitStyle;
    if (!elm || !isNormalNode(elm)) {
        return false;
    }
    const elmIsSame = elm.nodeName.toLowerCase() === element;
    const elmHasSameStyle = Boolean(options.attributes?.style &&
        hasSameStyleKeys(elm, options.attributes?.style));
    return elmIsSame && elmHasSameStyle;
}
