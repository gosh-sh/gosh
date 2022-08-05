import React, { useEffect } from "react";
/**
 * Hook that alerts clicks outside of the passed ref
 */
export function useKeyUp(ref: React.RefObject<HTMLDivElement>, callback: (...args: any[]) => void, deps: Array<any>) {
  useEffect(() => {
    console.log('Rehook');
    console.log(deps);
    function handleKeyUp(event: CustomEvent) {
      if (ref.current && !ref.current.contains(event.target as HTMLElement)) {
        callback(event);
      }
    }

    // Bind the event listener
    document.addEventListener("keyup", ((event: CustomEvent) => {
      handleKeyUp(event);
    }) as (event: Event) => void);
    return () => {
        // Unbind the event listener on clean up
        document.removeEventListener("keyup", ((event: CustomEvent) => {
          handleKeyUp(event);
        }) as (event: Event) => void);
    };
  }, [ref, ...deps]);
}

export default useKeyUp;