import type { ScreenMap } from '../types';
import { CategoryScreen } from './CategoryScreen';
import { CheckoutScreen } from './CheckoutScreen';
import { OrderScreen } from './OrderScreen';
import { PaymentCompleteScreen } from './PaymentCompleteScreen';
import { PaymentReaderScreen } from './PaymentReaderScreen';
import { PlayerModifiersScreen } from './PlayerModifiersScreen';
import { RegisterScreen } from './RegisterScreen';
import { ReserveConfirmScreen } from './ReserveConfirmScreen';
import { TeePickerScreen } from './TeePickerScreen';
import { TipScreen } from './TipScreen';

/** Register destination — desktop sections 1 · Register & Order, 4 · Tee Time Selection, 5 · Payment. */
export const registerScreens: Pick<
  ScreenMap,
  | 'register'
  | 'category'
  | 'order'
  | 'playerModifiers'
  | 'teePicker'
  | 'reserveConfirm'
  | 'checkout'
  | 'tip'
  | 'paymentReader'
  | 'paymentComplete'
> = {
  register: RegisterScreen,
  category: CategoryScreen,
  order: OrderScreen,
  playerModifiers: PlayerModifiersScreen,
  teePicker: TeePickerScreen,
  reserveConfirm: ReserveConfirmScreen,
  checkout: CheckoutScreen,
  tip: TipScreen,
  paymentReader: PaymentReaderScreen,
  paymentComplete: PaymentCompleteScreen,
};
