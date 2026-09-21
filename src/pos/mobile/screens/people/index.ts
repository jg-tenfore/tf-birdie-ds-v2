import type { ScreenMap } from '../types';
import { BlockTimeScreen } from './BlockTimeScreen';
import { CourseSettingsScreen } from './CourseSettingsScreen';
import { GolferDetailScreen } from './GolferDetailScreen';
import { GolferPickerScreen } from './GolferPickerScreen';
import { LeagueScreen } from './LeagueScreen';
import { MoreScreen } from './MoreScreen';
import { NewCustomerScreen } from './NewCustomerScreen';
import { PeopleScreen } from './PeopleScreen';
import { PriceOverrideScreen } from './PriceOverrideScreen';
import { RateCardScreen } from './RateCardScreen';
import { TimeNoteScreen } from './TimeNoteScreen';

/** People + More destinations — desktop sections 7 · People and 6 · Operations. */
export const peopleScreens: Pick<
  ScreenMap,
  | 'people'
  | 'golferDetail'
  | 'newCustomer'
  | 'golferPicker'
  | 'more'
  | 'blockTime'
  | 'timeNote'
  | 'priceOverride'
  | 'league'
  | 'rateCard'
  | 'courseSettings'
> = {
  people: PeopleScreen,
  golferDetail: GolferDetailScreen,
  newCustomer: NewCustomerScreen,
  golferPicker: GolferPickerScreen,
  more: MoreScreen,
  blockTime: BlockTimeScreen,
  timeNote: TimeNoteScreen,
  priceOverride: PriceOverrideScreen,
  league: LeagueScreen,
  rateCard: RateCardScreen,
  courseSettings: CourseSettingsScreen,
};
