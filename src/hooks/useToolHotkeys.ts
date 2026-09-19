import { useEffect } from 'react';
import { useAppStore } from '@/state/appStore';
import { isTypingTarget, toolForHotkey } from '@/utils/toolShortcuts';

export function useToolHotkeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) useAppStore.getState().redo();
        else useAppStore.getState().undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        useAppStore.getState().redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useAppStore.getState().deleteSelected();
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
        const tool = toolForHotkey(e.code, e.key);
        if (tool) {
          e.preventDefault();
          useAppStore.getState().setTool(tool);
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
}
