import type { Golfer } from '../types';

/**
 * CRM records, ported verbatim from the prototype.
 *
 * There are two lists because the prototype uses them for different jobs:
 *
 *  - `MEMBER_DB` is the authoritative roster — 28 records spanning all five
 *    membership tiers plus a few guests. Member lookup, golfer search, and the
 *    membership dot on tee-sheet chips all read from it.
 *  - `GOLFER_DB` is the smaller quick-search set behind the walk-in and
 *    guest-detail forms. Its eight records are a subset of `MEMBER_DB` by id,
 *    minus the `joined` field.
 *
 * Names are stored "Last, First" because the tee sheet sorts and displays
 * surname-first.
 */
export const MEMBER_DB: Golfer[] = [
  // ── Annual Members ──
  {id:'G001', name:'Thompson, Michael', phone:'(555) 234-1234', email:'m.thompson@email.com',  type:'Member', memberType:'annual',   hcp:8,  joined:'2021-03'},
  {id:'G002', name:'Johnson, Sarah',    phone:'(555) 987-6543', email:'sjohnson@email.com',    type:'Member', memberType:'annual',   hcp:14, joined:'2020-07'},
  {id:'G006', name:'Farnsworth, Weston',phone:'(555) 442-9910', email:'wfarnsworth@email.com', type:'Member', memberType:'annual',   hcp:11, joined:'2019-04'},
  {id:'M005', name:'Kim, David',        phone:'(555)400-0005', email:'dkim@email.com',         type:'Member', memberType:'annual',   hcp:8,  joined:'2022-01'},
  {id:'M008', name:'Walsh, Patricia',   phone:'(555)400-0008', email:'pwalsh@email.com',       type:'Member', memberType:'annual',   hcp:12, joined:'2021-09'},
  {id:'M009', name:'Harrington, Cole',  phone:'(555)400-0009', email:'charrington@email.com',  type:'Member', memberType:'annual',   hcp:4,  joined:'2018-06'},
  {id:'M010', name:'Delgado, Ana',      phone:'(555)400-0010', email:'adelgado@email.com',     type:'Member', memberType:'annual',   hcp:17, joined:'2023-02'},
  // ── Seasonal Members ──
  {id:'G004', name:'Chen, Emily',       phone:'(555) 321-9876', email:'echen@email.com',       type:'Member', memberType:'seasonal', hcp:5,  joined:'2023-04'},
  {id:'M006', name:'Torres, Maria',     phone:'(555)400-0006', email:'mtorres@email.com',      type:'Member', memberType:'seasonal', hcp:16, joined:'2023-04'},
  {id:'M011', name:'Okonkwo, James',    phone:'(555)400-0011', email:'jokonkwo@email.com',     type:'Member', memberType:'seasonal', hcp:9,  joined:'2023-04'},
  {id:'M012', name:'Patel, Priya',      phone:'(555)400-0012', email:'ppatel@email.com',       type:'Member', memberType:'seasonal', hcp:21, joined:'2024-04'},
  // ── Monthly Members ──
  {id:'G007', name:'Reed, Marcus',      phone:'(555) 201-3344', email:'mreed@email.com',       type:'Member', memberType:'monthly',  hcp:6,  joined:'2024-01'},
  {id:'M007', name:'Nguyen, Kevin',     phone:'(555)400-0007', email:'knguyen@email.com',      type:'Member', memberType:'monthly',  hcp:22, joined:'2024-02'},
  {id:'M013', name:'Brooks, Keisha',    phone:'(555)400-0013', email:'kbrooks@email.com',      type:'Member', memberType:'monthly',  hcp:19, joined:'2024-03'},
  {id:'M014', name:'Russo, Anthony',    phone:'(555)400-0014', email:'arusso@email.com',       type:'Member', memberType:'monthly',  hcp:28, joined:'2024-04'},
  // ── Senior Members (65+) ──
  {id:'M003', name:'Okafor, James',     phone:'(555)400-0003', email:'jokafor@email.com',      type:'Member', memberType:'senior',   hcp:14, joined:'2020-05'},
  {id:'M004', name:'Park, Susan',       phone:'(555)400-0004', email:'spark@email.com',        type:'Member', memberType:'senior',   hcp:18, joined:'2019-11'},
  {id:'M015', name:'Whitfield, Gerald', phone:'(555)400-0015', email:'gwhitfield@email.com',   type:'Member', memberType:'senior',   hcp:10, joined:'2017-08'},
  {id:'M016', name:'Flanagan, Dorothy', phone:'(555)400-0016', email:'dflanagan@email.com',    type:'Member', memberType:'senior',   hcp:24, joined:'2021-03'},
  // ── Student Members (under 25) ──
  {id:'M001', name:'Blake, Ethan',      phone:'(555)400-0001', email:'eblake@email.com',       type:'Member', memberType:'student',  hcp:24, joined:'2024-08'},
  {id:'M002', name:'Novak, Carmen',     phone:'(555)400-0002', email:'cnovak@email.com',       type:'Member', memberType:'student',  hcp:20, joined:'2024-08'},
  {id:'M017', name:'Yuen, Marcus',      phone:'(555)400-0017', email:'myuen@email.com',        type:'Member', memberType:'student',  hcp:15, joined:'2023-09'},
  {id:'M018', name:'Sharma, Priti',     phone:'(555)400-0018', email:'psharma@email.com',      type:'Member', memberType:'student',  hcp:30, joined:'2024-01'},
  // ── Guests (non-members) ──
  {id:'G003', name:'Martinez, Robert',  phone:'(555) 456-7890', email:'rob.martinez@email.com',type:'Guest',  memberType:null,       hcp:22, joined:null},
  {id:'G005', name:'Williams, David',   phone:'(555) 654-3210', email:'dwilliams@email.com',   type:'Guest',  memberType:null,       hcp:18, joined:null},
  {id:'G008', name:'Bennett, Laura',    phone:'(555) 883-2210', email:'lbennett@email.com',    type:'Guest',  memberType:null,       hcp:20, joined:null},
];

/** Quick-search subset used by the walk-in and guest-detail forms. */
export const GOLFER_DB: Golfer[] = [
  {id:'G001', name:'Thompson, Michael', phone:'(555) 234-1234', email:'m.thompson@email.com',  type:'Member', memberType:'annual',   hcp:8},
  {id:'G002', name:'Johnson, Sarah',    phone:'(555) 987-6543', email:'sjohnson@email.com',    type:'Member', memberType:'annual',   hcp:14},
  {id:'G003', name:'Martinez, Robert',  phone:'(555) 456-7890', email:'rob.martinez@email.com',type:'Guest',  memberType:null,       hcp:22},
  {id:'G004', name:'Chen, Emily',       phone:'(555) 321-9876', email:'echen@email.com',       type:'Member', memberType:'seasonal', hcp:5},
  {id:'G005', name:'Williams, David',   phone:'(555) 654-3210', email:'dwilliams@email.com',   type:'Guest',  memberType:null,       hcp:18},
  {id:'G006', name:'Farnsworth, Weston',phone:'(555) 442-9910', email:'wfarnsworth@email.com', type:'Member', memberType:'annual',   hcp:11},
  {id:'G007', name:'Reed, Marcus',      phone:'(555) 201-3344', email:'mreed@email.com',       type:'Member', memberType:'monthly',  hcp:6},
  {id:'G008', name:'Bennett, Laura',    phone:'(555) 883-2210', email:'lbennett@email.com',    type:'Guest',  memberType:null,       hcp:20},
];

/** Every known person, de-duplicated by id — `MEMBER_DB` wins on conflicts. */
export const ALL_GOLFERS: Golfer[] = [
  ...MEMBER_DB,
  ...GOLFER_DB.filter((g) => !MEMBER_DB.some((m) => m.id === g.id)),
];

/** Digits-only phone, for matching numbers written in inconsistent formats. */
export const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

/** Find a member by phone number, ignoring punctuation and spacing. */
export function findMemberByPhone(phone: string): Golfer | undefined {
  const digits = normalizePhone(phone);
  if (!digits) return undefined;
  return MEMBER_DB.find((m) => normalizePhone(m.phone) === digits);
}

/**
 * Find a member by display name, tolerating the abbreviated forms the tee sheet
 * uses: chips render `'Blake, E.'` where the CRM holds `'Blake, Ethan'`. An exact
 * match wins; otherwise a surname match plus a first-initial prefix counts.
 */
export function findMemberByName(playerName: string): Golfer | undefined {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[,.\s]+/g, ' ')
      .trim();
  const target = norm(playerName);
  if (!target) return undefined;

  const exact = MEMBER_DB.find((m) => norm(m.name) === target);
  if (exact) return exact;

  const [lastName, firstPart] = target.split(' ');
  if (!lastName) return undefined;
  return MEMBER_DB.find((m) => {
    const [mLast, mFirst = ''] = norm(m.name).split(' ');
    if (mLast !== lastName) return false;
    if (!firstPart) return true;
    return mFirst.startsWith(firstPart);
  });
}
