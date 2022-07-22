import React, { useEffect } from "react";
/**
 * Hook that alerts clicks outside of the passed ref
 */
export default function useOutsideClick(ref: React.RefObject<HTMLDivElement>, callback: () => void) {
  useEffect(() => {
    function handleClickOutside(event: CustomEvent) {
      if (ref.current && !ref.current.contains(event.target as HTMLElement)) {
        callback();
      }
    }

    // Bind the event listener
    document.addEventListener("mousedown", ((event: CustomEvent) => {
        handleClickOutside(event);
    }) as (event: Event) => void);
    return () => {
        // Unbind the event listener on clean up
        document.removeEventListener("mousedown", ((event: CustomEvent) => {
            handleClickOutside(event);
        }) as (event: Event) => void);
    };
  }, [ref]);
}