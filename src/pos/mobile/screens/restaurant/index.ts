import type { ScreenMap } from '../types';
import { CounterOrderScreen } from './CounterOrderScreen';
import { DishScreen } from './DishScreen';
import { MenuScreen, QuickOrderScreen } from './MenuScreen';
import { MoveTabScreen } from './MoveTabScreen';
import { OpenTabScreen } from './OpenTabScreen';
import { OrdersTipsScreen } from './OrdersTipsScreen';
import { ReservationsScreen, SeatReservationScreen } from './ReservationsScreen';
import { TabScreen } from './TabScreen';
import { TablesScreen } from './TablesScreen';
import { TabsScreen } from './TabsScreen';

/**
 * The restaurant on the handheld (V1 → V2) — the tablet's Tables, Tabs, Quick Order, Reservations
 * and Orders & Tips, on the same store and rules (`state/restaurant.ts`, `logic/restaurant.ts`).
 */
export const restaurantScreens: Pick<
  ScreenMap,
  | 'tables'
  | 'tabs'
  | 'quickOrder'
  | 'reservations'
  | 'ordersTips'
  | 'tab'
  | 'menu'
  | 'dish'
  | 'openTab'
  | 'moveTab'
  | 'seatReservation'
  | 'counterOrder'
> = {
  tables: TablesScreen,
  tabs: TabsScreen,
  quickOrder: QuickOrderScreen,
  reservations: ReservationsScreen,
  ordersTips: OrdersTipsScreen,
  tab: TabScreen,
  menu: MenuScreen,
  dish: DishScreen,
  openTab: OpenTabScreen,
  moveTab: MoveTabScreen,
  seatReservation: SeatReservationScreen,
  counterOrder: CounterOrderScreen,
};
