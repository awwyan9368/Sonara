'use client';

import * as ReactDOM from 'react-dom/client';

/**
 * Global React 19 safety patch for third-party libraries (e.g. @react-three/drei).
 * Prevents:
 * 1. "Attempted to synchronously unmount a root while React was already rendering" (React 19 render cycle conflict)
 * 2. "You are calling ReactDOMClient.createRoot() on a container that has already been passed to createRoot() before" (StrictMode / fast re-mount)
 */
if (typeof window !== 'undefined') {
  const originalCreateRoot = ReactDOM.createRoot;
  if (originalCreateRoot && !(originalCreateRoot as any).__react19_safe_unmount) {
    const containerRootMap = new WeakMap<Element | DocumentFragment, ReactDOM.Root>();
    const pendingUnmounts = new WeakMap<Element | DocumentFragment, ReturnType<typeof setTimeout>>();

    const patchedCreateRoot = function (
      container: Element | DocumentFragment,
      options?: ReactDOM.RootOptions
    ): ReactDOM.Root {
      // Cancel any pending unmount if the same container is being remounted (e.g., StrictMode)
      if (pendingUnmounts.has(container)) {
        clearTimeout(pendingUnmounts.get(container));
        pendingUnmounts.delete(container);
      }

      // If a root already exists for this container, reuse the active root
      if (containerRootMap.has(container)) {
        return containerRootMap.get(container)!;
      }

      const root = originalCreateRoot.call(ReactDOM, container, options);
      containerRootMap.set(container, root);
      const originalUnmount = root.unmount.bind(root);

      root.unmount = function () {
        // Schedule unmount past the current React render cycle
        const timer = setTimeout(() => {
          pendingUnmounts.delete(container);
          containerRootMap.delete(container);
          try {
            originalUnmount();
          } catch {
            // Silently absorb unmount collisions during fast React transitions
          }
        }, 0);
        pendingUnmounts.set(container, timer);
      };

      return root;
    };

    (patchedCreateRoot as any).__react19_safe_unmount = true;
    (ReactDOM as any).createRoot = patchedCreateRoot;
  }
}
