import type { SvgIconComponent } from '@mui/icons-material';
import Add from '@mui/icons-material/Add';
import AddCircle from '@mui/icons-material/AddCircle';
import AddShoppingCart from '@mui/icons-material/AddShoppingCart';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import AttachMoney from '@mui/icons-material/AttachMoney';
import Backspace from '@mui/icons-material/Backspace';
import BarChart from '@mui/icons-material/BarChart';
import Block from '@mui/icons-material/Block';
import CalendarViewDay from '@mui/icons-material/CalendarViewDay';
import CalendarViewWeek from '@mui/icons-material/CalendarViewWeek';
import CallSplit from '@mui/icons-material/CallSplit';
import Cancel from '@mui/icons-material/Cancel';
import CardGiftcard from '@mui/icons-material/CardGiftcard';
import Check from '@mui/icons-material/Check';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Circle from '@mui/icons-material/Circle';
import Close from '@mui/icons-material/Close';
import Contactless from '@mui/icons-material/Contactless';
import ContentCopy from '@mui/icons-material/ContentCopy';
import CreditCard from '@mui/icons-material/CreditCard';
import DateRange from '@mui/icons-material/DateRange';
import Delete from '@mui/icons-material/Delete';
import DeleteSweep from '@mui/icons-material/DeleteSweep';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import DirectionsWalk from '@mui/icons-material/DirectionsWalk';
import Download from '@mui/icons-material/Download';
import Edit from '@mui/icons-material/Edit';
import Eject from '@mui/icons-material/Eject';
import ElectricScooter from '@mui/icons-material/ElectricScooter';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import Error from '@mui/icons-material/Error';
import EventAvailable from '@mui/icons-material/EventAvailable';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Flag from '@mui/icons-material/Flag';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import Forum from '@mui/icons-material/Forum';
import Fullscreen from '@mui/icons-material/Fullscreen';
import GolfCourse from '@mui/icons-material/GolfCourse';
import Group from '@mui/icons-material/Group';
import Groups from '@mui/icons-material/Groups';
import History from '@mui/icons-material/History';
import HowToReg from '@mui/icons-material/HowToReg';
import Info from '@mui/icons-material/Info';
import Label from '@mui/icons-material/Label';
import LocalOffer from '@mui/icons-material/LocalOffer';
import Lock from '@mui/icons-material/Lock';
import Mail from '@mui/icons-material/Mail';
import ManageAccounts from '@mui/icons-material/ManageAccounts';
import MenuOpen from '@mui/icons-material/MenuOpen';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import MoreVert from '@mui/icons-material/MoreVert';
import Nightlight from '@mui/icons-material/Nightlight';
import Notes from '@mui/icons-material/Notes';
import OpenInFull from '@mui/icons-material/OpenInFull';
import Paid from '@mui/icons-material/Paid';
import Payments from '@mui/icons-material/Payments';
import Person from '@mui/icons-material/Person';
import PersonAdd from '@mui/icons-material/PersonAdd';
import PersonOff from '@mui/icons-material/PersonOff';
import Phone from '@mui/icons-material/Phone';
import PointOfSale from '@mui/icons-material/PointOfSale';
import Print from '@mui/icons-material/Print';
import PriorityHigh from '@mui/icons-material/PriorityHigh';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import Receipt from '@mui/icons-material/Receipt';
import ReceiptLong from '@mui/icons-material/ReceiptLong';
import Repeat from '@mui/icons-material/Repeat';
import Reply from '@mui/icons-material/Reply';
import RestartAlt from '@mui/icons-material/RestartAlt';
import Schedule from '@mui/icons-material/Schedule';
import Search from '@mui/icons-material/Search';
import SearchOff from '@mui/icons-material/SearchOff';
import Sell from '@mui/icons-material/Sell';
import Settings from '@mui/icons-material/Settings';
import ShoppingCart from '@mui/icons-material/ShoppingCart';
import Sort from '@mui/icons-material/Sort';
import SportsGolf from '@mui/icons-material/SportsGolf';
import StickyNote2 from '@mui/icons-material/StickyNote2';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import Sync from '@mui/icons-material/Sync';
import SyncAlt from '@mui/icons-material/SyncAlt';
import Timer from '@mui/icons-material/Timer';
import TouchApp from '@mui/icons-material/TouchApp';
import Trolley from '@mui/icons-material/Trolley';
import Tune from '@mui/icons-material/Tune';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import VerticalAlignBottom from '@mui/icons-material/VerticalAlignBottom';
import VerticalAlignTop from '@mui/icons-material/VerticalAlignTop';
import ViewColumn from '@mui/icons-material/ViewColumn';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Warning from '@mui/icons-material/Warning';
import WbCloudy from '@mui/icons-material/WbCloudy';
import WbSunny from '@mui/icons-material/WbSunny';
import WbTwilight from '@mui/icons-material/WbTwilight';
import WorkspacePremium from '@mui/icons-material/WorkspacePremium';

/**
 * Material Symbols name → MUI icon component.
 *
 * The prototype writes icons as Material Symbols ligatures (`<span class="ms">
 * how_to_reg</span>`), and those names are embedded throughout the ported data
 * files — `SETTINGS_MENU_ITEMS`, `AP_CONFIGS`, `PR_CONFIG`, `TRANSPORT_META`,
 * shift definitions, and the context menus. Rather than rewrite every one, this
 * map keeps the ligature name as the shared vocabulary and resolves it to a real
 * React component at render time.
 *
 * Icons are imported one-per-line from their own module paths so the bundler can
 * tree-shake — a barrel import of `@mui/icons-material` would pull in thousands.
 *
 * All names resolve to Material Icons equivalents except one: Material Symbols'
 * `person_check` has no Material Icons counterpart, so it aliases `HowToReg`,
 * which is the same person-with-a-checkmark glyph.
 */
export const ICONS: Record<string, SvgIconComponent> = {
  add: Add,
  add_circle: AddCircle,
  add_shopping_cart: AddShoppingCart,
  arrow_back: ArrowBack,
  arrow_drop_down: ArrowDropDown,
  attach_money: AttachMoney,
  backspace: Backspace,
  bar_chart: BarChart,
  block: Block,
  calendar_view_day: CalendarViewDay,
  calendar_view_week: CalendarViewWeek,
  call_split: CallSplit,
  cancel: Cancel,
  card_giftcard: CardGiftcard,
  check: Check,
  check_circle: CheckCircle,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  circle: Circle,
  close: Close,
  contactless: Contactless,
  content_copy: ContentCopy,
  credit_card: CreditCard,
  date_range: DateRange,
  delete: Delete,
  delete_sweep: DeleteSweep,
  directions_car: DirectionsCar,
  directions_walk: DirectionsWalk,
  download: Download,
  edit: Edit,
  eject: Eject,
  electric_scooter: ElectricScooter,
  emoji_events: EmojiEvents,
  error: Error,
  event_available: EventAvailable,
  expand_more: ExpandMore,
  flag: Flag,
  format_list_bulleted: FormatListBulleted,
  forum: Forum,
  fullscreen: Fullscreen,
  golf_course: GolfCourse,
  group: Group,
  groups: Groups,
  history: History,
  how_to_reg: HowToReg,
  info: Info,
  label: Label,
  local_offer: LocalOffer,
  lock: Lock,
  mail: Mail,
  manage_accounts: ManageAccounts,
  menu_open: MenuOpen,
  more_horiz: MoreHoriz,
  more_vert: MoreVert,
  nightlight: Nightlight,
  notes: Notes,
  open_in_full: OpenInFull,
  paid: Paid,
  payments: Payments,
  person: Person,
  person_add: PersonAdd,
  person_off: PersonOff,
  phone: Phone,
  point_of_sale: PointOfSale,
  print: Print,
  priority_high: PriorityHigh,
  radio_button_unchecked: RadioButtonUnchecked,
  receipt: Receipt,
  receipt_long: ReceiptLong,
  repeat: Repeat,
  reply: Reply,
  restart_alt: RestartAlt,
  schedule: Schedule,
  search: Search,
  search_off: SearchOff,
  sell: Sell,
  settings: Settings,
  shopping_cart: ShoppingCart,
  sort: Sort,
  sports_golf: SportsGolf,
  sticky_note_2: StickyNote2,
  swap_horiz: SwapHoriz,
  sync: Sync,
  sync_alt: SyncAlt,
  timer: Timer,
  touch_app: TouchApp,
  trolley: Trolley,
  tune: Tune,
  verified_user: VerifiedUser,
  vertical_align_bottom: VerticalAlignBottom,
  vertical_align_top: VerticalAlignTop,
  view_column: ViewColumn,
  visibility_off: VisibilityOff,
  warning: Warning,
  wb_cloudy: WbCloudy,
  wb_sunny: WbSunny,
  wb_twilight: WbTwilight,
  workspace_premium: WorkspacePremium,
  person_check: HowToReg,
};

/**
 * Resolve a ligature name to a component, falling back to a neutral dot so a
 * typo degrades to a placeholder instead of crashing the render.
 */
export function iconFor(name: string | undefined): SvgIconComponent {
  if (!name) return Circle;
  return ICONS[name] ?? Circle;
}
