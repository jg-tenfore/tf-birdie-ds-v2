import { EmptyState } from '../primitives';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/** Customer Search (V1 → V2, Wave 3). A placeholder until its screen lands. */
export function CustomersView() {
  return (
    <OpsScreen data-customers>
      <OpsToolbar title="Customer Search" />
      <EmptyState icon="person_search" label="Customer Search is being built" />
    </OpsScreen>
  );
}
