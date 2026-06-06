import { useCallback, useEffect, useRef, useState } from 'react';

const TAP_REVEAL_MS = 2000;

type HoverReveal = {
  revealed: boolean;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onPress: () => void;
};

// Revela algo enquanto o mouse está sobre o alvo (web/PC, via onHoverIn/onHoverOut
// do Pressable) e, no toque (mobile, via onPress), revela e esconde sozinho após
// TAP_REVEAL_MS. O toque com mouse em cima não auto-esconde — o hover governa.
//
//   const { revealed, onHoverIn, onHoverOut, onPress } = useHoverReveal();
//   <Pressable onHoverIn={onHoverIn} onHoverOut={onHoverOut} onPress={onPress}>…
export function useHoverReveal(): HoverReveal {
  const [revealed, setRevealed] = useState(false);
  const hovering = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const onHoverIn = useCallback(() => {
    hovering.current = true;
    clearTimer();
    setRevealed(true);
  }, [clearTimer]);

  const onHoverOut = useCallback(() => {
    hovering.current = false;
    clearTimer();
    setRevealed(false);
  }, [clearTimer]);

  const onPress = useCallback(() => {
    clearTimer();
    setRevealed(true);
    if (!hovering.current) {
      timer.current = setTimeout(() => setRevealed(false), TAP_REVEAL_MS);
    }
  }, [clearTimer]);

  return { revealed, onHoverIn, onHoverOut, onPress };
}
