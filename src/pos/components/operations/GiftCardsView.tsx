import { EmptyState } from '../primitives';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/** Gift Cards (V1 → V2, Wave 3). A placeholder until its screen lands. */
export function GiftCardsView() {
  return (
    <OpsScreen data-gift-cards>
      <OpsToolbar title="Gift Cards" />
      <EmptyState icon="card_giftcard" label="Gift Cards is being built" />
    </OpsScreen>
  );
}
