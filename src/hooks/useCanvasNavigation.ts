import { useEffect, useState } from 'react';
import { isTypingTarget } from '@/utils/toolShortcuts';

export function useCanvasNavigation(onSpaceDown: () => void, onSpaceUp: () => void) {
  const [spaceHeld, setSpaceHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
        onSpaceDown();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        onSpaceUp();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onSpaceDown, onSpaceUp]);

  return { spaceHeld };
}
