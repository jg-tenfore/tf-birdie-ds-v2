import { EmptyState } from '../primitives';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/** Time Clock (V1 → V2, Wave 3). A placeholder until its screen lands. */
export function TimeClockView() {
  return (
    <OpsScreen data-time-clock>
      <OpsToolbar title="Time Clock" />
      <EmptyState icon="schedule" label="Time Clock is being built" />
    </OpsScreen>
  );
}
