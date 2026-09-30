import { EmptyState } from '../primitives';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/** Shift (V1 → V2, Wave 3). A placeholder until its screen lands. */
export function ShiftView() {
  return (
    <OpsScreen data-shift>
      <OpsToolbar title="Shift" />
      <EmptyState icon="point_of_sale" label="Shift is being built" />
    </OpsScreen>
  );
}
