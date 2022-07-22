import { RefObject } from 'react';
import { useScrollspy } from './useScrollspy';

export { useScrollspy };

export const Scrollspy = ({
  children,
  sectionRefs,
  rootSelector,
  offset,
}: {
  children: ({
    elementsScrolled,
    elementsStatusInViewport,
    currentElementIndexInViewport,
    scrollTop
  }: {
    elementsScrolled: boolean[];
    elementsStatusInViewport: boolean[];
    currentElementIndexInViewport: number;
    scrollTop: number;
  }) => JSX.Element;
  sectionRefs: RefObject<Element>[];
  rootSelector?: string;
  offset?: number;
}) => {
  const {
    elementsScrolled,
    elementsStatusInViewport,
    currentElementIndexInViewport,
    scrollTop
  } = useScrollspy({
    sectionRefs,
    rootSelector,
    offset,
  });

  return children({
    scrollTop,
    elementsScrolled,
    elementsStatusInViewport,
    currentElementIndexInViewport,
  });
};
