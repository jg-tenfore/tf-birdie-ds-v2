import { EmptyState } from '../primitives';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/** Events (V1 → V2, Wave 3). A placeholder until its screen lands. */
export function EventsView() {
  return (
    <OpsScreen data-events>
      <OpsToolbar title="Events" />
      <EmptyState icon="event" label="Events is being built" />
    </OpsScreen>
  );
}
