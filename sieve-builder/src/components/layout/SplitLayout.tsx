import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { EditorPane } from './EditorPane';
import { PreviewPane } from './PreviewPane';

export function SplitLayout() {
  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <Allotment defaultSizes={[60, 40]}>
        <Allotment.Pane minSize={280}>
          <EditorPane />
        </Allotment.Pane>
        <Allotment.Pane minSize={200}>
          <PreviewPane />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
