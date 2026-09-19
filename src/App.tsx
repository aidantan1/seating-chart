import { LayoutCanvas } from '@/components/Canvas/LayoutCanvas';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { SidePanel } from '@/components/SidePanel';
import { Toolbar } from '@/components/Toolbar';
import { useToolHotkeys } from '@/hooks/useToolHotkeys';

export function App() {
  useToolHotkeys();

  return (
    <div className="app">
      <div className="workspace">
        <SidePanel side="left" label="Tools" storageKey="panel-left" defaultWidth={220}>
          <Toolbar />
        </SidePanel>
        <LayoutCanvas />
        <SidePanel side="right" label="Properties" storageKey="panel-right" defaultWidth={240}>
          <PropertiesPanel />
        </SidePanel>
      </div>
    </div>
  );
}
