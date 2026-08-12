import type { MemberTypeKey } from '../../theme/tokens';
import type { CatalogCategory, CatalogItem, SearchableItem } from '../types';

/**
 * Product catalog — ported verbatim from the prototype's `CATALOG` block.
 *
 * Category order matters: `CAT_ROWS` lays the buttons out in two rows above the
 * item grid, and 'CHECK IN' leads because ringing a round is the first thing an
 * operator does at the counter. Each category carries its own tile color, which
 * is how staff navigate the grid by muscle memory rather than by reading labels.
 */
export const CATALOG: Record<string, CatalogCategory> = {
  'CHECK IN': { color:'#1a1c1a', tc:'#fff', items:[
    {n:'Guest Rate 9 Holes',     p:35,  memberType:null},
    {n:'Guest Rate 18 Holes',    p:59,  memberType:null},
    {n:'Replay 9',               p:20,  memberType:null},
    {n:'Replay 18',              p:35,  memberType:null},
    {n:'Walking Only',           p:25,  memberType:null},
    {n:'Annual Member 9 Holes',  p:0,   memberType:'annual'},
    {n:'Annual Member 18 Holes', p:0,   memberType:'annual'},
    {n:'Seasonal Member 9 Holes',p:15,  memberType:'seasonal'},
    {n:'Seasonal Member 18 Holes',p:25, memberType:'seasonal'},
    {n:'Monthly Member 9 Holes', p:20,  memberType:'monthly'},
    {n:'Monthly Member 18 Holes',p:35,  memberType:'monthly'},
    {n:'Senior Member 9 Holes',  p:18,  memberType:'senior'},
    {n:'Senior Member 18 Holes', p:30,  memberType:'senior'},
    {n:'Student Member 9 Holes',   p:18,  memberType:'student'},
    {n:'Student Member 18 Holes',  p:28,  memberType:'student'},
  ]},
  'MODIFIERS': { color:'#2563eb', tc:'#fff', isModifier:true, items:[
    {n:'Twilight Rate',     p:29,  tag:'TWILIGHT',   tagColor:'#7c3aed', desc:'Overrides round price to $29'},
    {n:'Early Bird Rate',   p:25,  tag:'EARLY BIRD', tagColor:'#d97706', desc:'Overrides round price to $25'},
    {n:'Junior Rate',       p:18,  tag:'JUNIOR',     tagColor:'#15803d', desc:'Overrides round price to $18'},
    {n:'Riding Cart',       p:20,  tag:'CART',       tagColor:'#1d4ed8', desc:'+$20 riding cart fee', isTransport:true},
    {n:'Push Cart',         p:5,   tag:'PUSH CART',  tagColor:'#374151', desc:'+$5 push cart fee', isTransport:true},
    {n:'Military Discount', p:-10, tag:'MILITARY',   tagColor:'#1d4ed8', desc:'$10 off round price', isDiscount:true},
    {n:'Staff Rate',        p:-15, tag:'STAFF',      tagColor:'#374151', desc:'$15 off round price', isDiscount:true},
    {n:'Comp Round',        p:0,   tag:'COMP',       tagColor:'#16a34a', desc:'Complimentary round – $0', isOverride:true, overridePrice:0},
    {n:'Rain Delay Credit', p:-5,  tag:'RAIN DLY',   tagColor:'#0891b2', desc:'$5 credit applied', isDiscount:true},
    {n:'Coupon 10%',        p:-3.5,tag:'COUPON',     tagColor:'#be185d', desc:'10% coupon discount', isDiscount:true},
  ]},
  'RENTALS': { color:'#4caf82', tc:'#fff', items:[
    {n:'Club Rental Full Set',p:45},{n:'Club Rental Half Set',p:28},{n:'Pull Cart',p:8},
    {n:'Riding Cart 18',p:20},{n:'Riding Cart 9',p:14},{n:'GPS Unit',p:8},
    {n:'Rain Poncho',p:12},{n:'Umbrella',p:10},{n:'Shoe Rental',p:15}]},
  'GOLF BALLS': { color:'#c0392b', tc:'#fff', items:[
    {n:'Titleist Pro V1 Box',p:54},{n:'Titleist Pro V1x Box',p:54},{n:'Titleist Pro V1 Sleeve',p:16},
    {n:'Titleist Pro V1x Sleeve',p:16},{n:'Titleist AVX Box',p:50},{n:'Titleist AVX Sleeve',p:15},
    {n:'Titleist Tour Speed Box',p:42},{n:'Titleist TruFeel Box',p:28},
    {n:'Callaway Chrome Soft Box',p:50},{n:'Callaway Chrome Soft Sleeve',p:15},
    {n:'Callaway Chrome Soft X Box',p:50},{n:'Callaway Supersoft Box',p:26},
    {n:'Callaway Warbird Box',p:22},{n:'TaylorMade TP5x Box',p:54},
    {n:'TaylorMade TP5 Box',p:54},{n:'TaylorMade TP5 Sleeve',p:16},
    {n:'TaylorMade Distance+ Box',p:24},{n:'TaylorMade Tour Response Box',p:38},
    {n:'Srixon Z-Star Box',p:44},{n:'Srixon Q-Star Tour Box',p:38},
    {n:'Srixon Soft Feel Box',p:24},{n:'Bridgestone Tour B X Box',p:48},
    {n:'Bridgestone Tour B XS Box',p:48},{n:'Bridgestone e6 Box',p:28},
    {n:'Logo Ball Single',p:6},{n:'Range Bucket Small',p:8},{n:'Range Bucket Large',p:14}]},
  'APPAREL': { color:'#f5c842', tc:'#1a1c1a', items:[
    {n:'Golf Polo Course Logo',p:55},{n:'Golf Polo Brand',p:65},{n:'Ladies Golf Shirt',p:58},
    {n:'Golf Shorts',p:48},{n:'Golf Hat Structured',p:32},{n:'Visor',p:24},
    {n:'Windbreaker',p:75},{n:'Rain Jacket',p:90},{n:'Golf Belt',p:35}]},
  'ACCESSORIES': { color:'#8bc34a', tc:'#1a1c1a', items:[
    {n:'Golf Glove Mens',p:18},{n:'Golf Glove Ladies',p:17},{n:'Tee Pack 50ct',p:6},
    {n:'Ball Marker',p:4},{n:'Divot Tool',p:8},{n:'Towel Course Logo',p:22},
    {n:'Headcover',p:28},{n:'Scorecard Holder',p:14}]},
  'SNACKS': { color:'#26c6a0', tc:'#fff', items:[
    {n:'Hot Dog',p:5},{n:'Hamburger',p:8},{n:'Pretzel',p:4},{n:'Chips',p:2.5},
    {n:'Candy Bar',p:2},{n:'Granola Bar',p:3},{n:'Fruit Cup',p:4},{n:'Cookie',p:2.5}]},
  'DRINKS': { color:'#40b4e8', tc:'#fff', items:[
    {n:'Water',p:2.5},{n:'Gatorade',p:3.5},{n:'Soda',p:3},{n:'Coffee',p:3.5},
    {n:'Iced Tea',p:3},{n:'Energy Drink',p:4},{n:'Smoothie',p:6}]},
  'ALCOHOL': { color:'#7c7fdd', tc:'#fff', items:[
    {n:'Beer Domestic',p:5},{n:'Beer Craft',p:7},{n:'Seltzer',p:5},
    {n:'Wine Glass',p:9},{n:'Cocktail',p:10},{n:'Bloody Mary',p:11}]},
  'PACKAGES': { color:'#c47fdd', tc:'#fff', items:[
    {n:'Golf & Cart 18',p:75},{n:'Golf & Cart 9',p:45},{n:'Twilight Package',p:45},
    {n:'Weekend Special',p:99},{n:'Corporate Outing',p:120},{n:'Junior Package',p:30}]},
  'MEMBERSHIP': { color:'#ff8a50', tc:'#fff', items:[
    {n:'Annual Individual',p:1800},{n:'Annual Family',p:2800},{n:'Senior Membership',p:1400},
    {n:'Junior Membership',p:600},{n:'Corporate Membership',p:3500}]},
  'SERVICES': { color:'#f48fb1', tc:'#1a1c1a', items:[
    {n:'Club Cleaning',p:15},{n:'Club Regrip Each',p:12},{n:'Club Fitting',p:60},
    {n:'Lesson 30 Min',p:55},{n:'Lesson 60 Min',p:95},{n:'Storage Locker',p:20}]},
  'PROMOTIONS': { color:'#ef9a9a', tc:'#1a1c1a', items:[
    {n:'10% Off Round',p:-8},{n:'Free Cart Coupon',p:-18},{n:'Member Discount',p:-10},
    {n:'Birthday Round',p:-20},{n:'Loyalty Reward',p:-5}]},
  'HIGH SPEED': { color:'#9fa8b4', tc:'#fff', items:[
    {n:'Golf Simulator 1hr',p:45},{n:'Launch Monitor 1hr',p:35},
    {n:'TrackMan Session',p:60},{n:'Video Analysis',p:40}]},
};

/** Category button layout: row 1 is the round/rental path, row 2 is retail. */
export const CAT_ROWS: string[][] = [
  ['CHECK IN','RENTALS','GOLF BALLS','APPAREL','ACCESSORIES'],
  ['SNACKS','DRINKS','ALCOHOL','PACKAGES','MEMBERSHIP','SERVICES','PROMOTIONS','HIGH SPEED'],
];

/** Every item flattened with its category, for the global search dropdown. */
export const ALL_ITEMS: SearchableItem[] = Object.entries(CATALOG).flatMap(([cat, d]) =>
  d.items.map((i) => ({ ...i, cat })),
);

/**
 * Item names that count as a *round* rather than merchandise.
 *
 * A check-in line is special: it carries the player roster, per-player
 * modifiers, and the attached tee time, and its quantity is driven by the player
 * count instead of a stepper. The 'Tee Time …' variants appear when a round is
 * created from the tee sheet rather than rung up from the catalog.
 */
export const CHECK_IN_ITEMS = new Set<string>([
  'Guest Rate 9 Holes','Guest Rate 18 Holes','Replay 9','Replay 18',
  'Walking Only',
  'Annual Member 9 Holes','Annual Member 18 Holes',
  'Seasonal Member 9 Holes','Seasonal Member 18 Holes',
  'Monthly Member 9 Holes','Monthly Member 18 Holes',
  'Senior Member 9 Holes','Senior Member 18 Holes',
  'Student Member 9 Holes','Student Member 18 Holes',
  'Tee Time 9 holes','Tee Time 18 holes','Tee Time 9H holes','Tee Time 18H holes',
]);

/**
 * Member-rate items → the membership tier required to ring them.
 *
 * Selecting one of these opens the member lookup, and the item is only added
 * once a matching member is picked. That gate is what stops a member price from
 * being applied to a walk-in.
 */
export const MEMBER_ITEM_TYPES: Record<string, MemberTypeKey> = {
  'Annual Member 9 Holes':   'annual',
  'Annual Member 18 Holes':  'annual',
  'Seasonal Member 9 Holes': 'seasonal',
  'Seasonal Member 18 Holes':'seasonal',
  'Monthly Member 9 Holes':  'monthly',
  'Monthly Member 18 Holes': 'monthly',
  'Senior Member 9 Holes':   'senior',
  'Senior Member 18 Holes':  'senior',
  'Student Member 9 Holes':    'student',
  'Student Member 18 Holes':   'student',
};

/** Modifier lookup by name, derived from the MODIFIERS category. */
export const MODIFIER_ITEMS: Record<string, CatalogItem> = Object.fromEntries(
  (CATALOG['MODIFIERS']?.items ?? []).map((m) => [m.n, m]),
);
