'use client';

import * as ReactDOM from 'react-dom/client';

/**
 * Global React 19 safety patch for third-party libraries (e.g. @react-three/drei).
 * Prevents the fatal error:
 * "Attempted to synchronously unmount a root while React was already rendering".
 */
if (typeof window !== 'undefined') {
  const originalCreateRoot = ReactDOM.createRoot;
  if (originalCreateRoot && !(originalCreateRoot as any).__react19_safe_unmount) {
    const patchedCreateRoot = function (
      container: Element | DocumentFragment,
      options?: ReactDOM.RootOptions
    ) {
      const root = originalCreateRoot.call(ReactDOM, container, options);
      const originalUnmount = root.unmount.bind(root);
      root.unmount = function () {
        setTimeout(() => {
          try {
            originalUnmount();
          } catch {
            // Silently absorb unmount collisions during fast React transitions
          }
        }, 0);
      };
      return root;
    };
    (patchedCreateRoot as any).__react19_safe_unmount = true;
    (ReactDOM as any).createRoot = patchedCreateRoot;
  }
}
