import { usePos } from '../state/PosProvider';
import { BookingDetail } from './BookingDetail';
import { NewBooking, ReserveConfirm, TeePicker } from './Booking';
import { Checkout, PaymentReader } from './Checkout';
import { ConfirmDialog, OpenItem, TeeSheetSearch } from './Misc';
import {
  ActionPanel,
  GolferSearch,
  GuestDetail,
  MemberLookup,
  NewCustomer,
  PlayerModifierPicker,
  WalkIn,
} from './People';
import {
  BlockTime,
  CourseRates,
  CourseTimeSettings,
  League,
  MovePlayers,
  TimeNote,
  TimePrice,
} from './TimeRow';

/**
 * Renders whichever overlay the current state names.
 *
 * A single switch over the `Modal` union means every dialog is reachable from a plain
 * state value and exactly one can be open — the type system enforces what the original
 * enforced by convention. It also makes the Storybook screen stories trivial: hand a
 * modal descriptor to `PosProvider` and that dialog renders over its screen.
 */
export function ModalHost() {
  const { state } = usePos();
  const m = state.modal;
  if (!m) return null;

  switch (m.kind) {
    case 'bookingDetail':
      return <BookingDetail bookingId={m.bookingId} initialTab={m.tab} />;
    case 'teePicker':
      return <TeePicker is18H={m.is18H} />;
    case 'reserveConfirm':
      return <ReserveConfirm payMode={m.payMode} />;
    case 'newBooking':
      return <NewBooking courseId={m.courseId} timeMin={m.timeMin} startSlot={m.startSlot} />;
    case 'checkout':
      return <Checkout />;
    case 'paymentReader':
      return <PaymentReader method={m.method} />;
    case 'memberLookup':
      return <MemberLookup itemName={m.itemName} requiredType={m.requiredType} />;
    case 'golferSearch':
      return <GolferSearch target={m.target} />;
    case 'guestDetail':
      return <GuestDetail guestIndex={m.guestIndex} />;
    case 'newCustomer':
      return <NewCustomer />;
    case 'walkIn':
      return <WalkIn />;
    case 'playerModifier':
      return <PlayerModifierPicker itemIdx={m.itemIdx} playerIdx={m.playerIdx} />;
    case 'actionPanel':
      return <ActionPanel action={m.action} />;
    case 'blockTime':
      return <BlockTime timeMin={m.timeMin} editing={m.editing} />;
    case 'timeNote':
      return <TimeNote timeMin={m.timeMin} />;
    case 'timePrice':
      return <TimePrice timeMin={m.timeMin} />;
    case 'league':
      return <League timeMin={m.timeMin} editGroupId={m.editGroupId} />;
    case 'movePlayers':
      return <MovePlayers timeMin={m.timeMin} />;
    case 'courseTimeSettings':
      return <CourseTimeSettings courseId={m.courseId} />;
    case 'courseRates':
      return <CourseRates courseId={m.courseId} />;
    case 'openItem':
      return <OpenItem />;
    case 'teeSheetSearch':
      return <TeeSheetSearch />;
    case 'confirm':
      return (
        <ConfirmDialog
          title={m.title}
          body={m.body}
          confirmLabel={m.confirmLabel}
          onConfirm={m.onConfirm}
        />
      );
    default:
      return null;
  }
}
