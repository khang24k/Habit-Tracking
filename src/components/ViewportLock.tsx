'use client';

import { useEffect } from 'react';

export function ViewportLock() {
  useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const options: AddEventListenerOptions = { passive: false };

    document.addEventListener('gesturestart', preventGesture, options);
    document.addEventListener('gesturechange', preventGesture, options);
    document.addEventListener('gestureend', preventGesture, options);
    document.addEventListener('touchstart', preventMultiTouch, options);
    document.addEventListener('touchmove', preventMultiTouch, options);

    return () => {
      document.removeEventListener('gesturestart', preventGesture, options);
      document.removeEventListener('gesturechange', preventGesture, options);
      document.removeEventListener('gestureend', preventGesture, options);
      document.removeEventListener('touchstart', preventMultiTouch, options);
      document.removeEventListener('touchmove', preventMultiTouch, options);
    };
  }, []);

  return null;
}
