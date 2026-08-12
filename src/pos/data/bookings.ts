import type { Booking, PlayerState } from '../types';

/**
 * Demo tee-sheet data.
 *
 * Built in three passes, all ported from the prototype:
 *
 *  1. `seedBookings()` — a hand-authored slate of ~135 bookings across the three
 *     courses on one dense day (2026-04-09), plus three lighter days. Only the
 *     dense day is used downstream; the others are kept because they document
 *     the shapes the sheet has to render.
 *  2. `applyDateWindow()` — reprojects that dense day across an 11-day window
 *     centred on the demo "today", thinning each day deterministically so no two
 *     days look alike, then layering realistic state on top (past days are
 *     settled, today's mornings are mid-round, future days are mostly unpaid).
 *  3. `injectMay21Specials()` — adds the non-bookable blocks and the staff shift
 *     change that demonstrate slot blocking.
 *
 * Everything is deterministic: the "today" anchor is a fixed date and the
 * thinning uses an FNV-1a hash of the booking id rather than `Math.random()`, so
 * the sheet looks identical on every load and in every screenshot.
 */

/** Which side of "today" a generated day falls on. */
type DayBucket = 'past' | 'today' | 'future';

/**
 * The demo's fixed "today": Thursday, May 21, 2026.
 *
 * Hard-coded rather than `new Date()` so the tee sheet, the date picker, and
 * every Storybook snapshot stay stable regardless of when they run.
 */
export const DEMO_TODAY = (): Date => new Date(2026, 4, 21);

function seedBookings(): Booking[] {
  // Helper to make playerStates
  function ps(n: number, paid: boolean | boolean[], step: number | number[]): PlayerState[] {
    return Array.from({length:n}, (_,i) => ({
      paid: Array.isArray(paid) ? paid[i] : paid,
      step: Array.isArray(step) ? step[i] : step,
      noShow: false
    }));
  }
  const W = 'walking' as const;
  const C = 'cart' as const;
  const P = 'push' as const;
  const PAID = 'paid' as const;
  const NS = 'no_show' as const;
  const OPEN = 'open' as const;
  const REF = 'refund' as const;

  const thu_bookings: Booking[] = [
  /* ═══════════════════════════════════════════
     THURSDAY APRIL 9 — TODAY (dense)
  ═══════════════════════════════════════════ */
  /* ── PONDS ── */
  {id:'p01',date:'2026-04-09',course:'ponds',slot:0,timeMin:360,name:'Harrison, T.',  players:4,cart:C,status:'booked',   phone:'(555)100-0001',conf:'R-3001',pay:PAID,price:100,holes:'18H',note:'Celebrating anniversary — please arrange complimentary scorecard',playerStates:ps(4,true,0)},
  {id:'p02',date:'2026-04-09',course:'ponds',slot:2,timeMin:360,name:'Garcia, L.',    players:2,cart:W,status:'member',   phone:'(555)100-0002',conf:'M-3002',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p03',date:'2026-04-09',course:'ponds',slot:0,timeMin:368,name:'Reed, M.',      players:2,cart:W,status:'booked',   phone:'(555)201-3344',conf:'R-2841',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p04',date:'2026-04-09',course:'ponds',slot:2,timeMin:368,name:'Foster, A.',    players:3,cart:C,status:'checkedin',phone:'(555)100-0004',conf:'R-3004',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,1)},
  {id:'p05',date:'2026-04-09',course:'ponds',slot:0,timeMin:376,name:'Farnsworth, W.',players:2,cart:C,status:'booked',   phone:'(555)442-9910',conf:'R-2842',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'p06',date:'2026-04-09',course:'ponds',slot:2,timeMin:376,name:'Bennett, L.',   players:1,cart:W,status:'walkin',   phone:'(555)883-2210',conf:'R-2844',pay:PAID,price:59, holes:'9H', playerStates:ps(1,true,0)},
  {id:'p07',date:'2026-04-09',course:'ponds',slot:0,timeMin:384,name:'Mitchell, R.',  players:4,cart:C,status:'group',    phone:'(555)100-0008',conf:'G-3008',pay:PAID,price:120,holes:'18H',playerStates:ps(4,[true,true,false,true],1)},
  {id:'p08',date:'2026-04-09',course:'ponds',slot:2,timeMin:384,name:'Cooper, S.',    players:2,cart:P,status:'member',   phone:'(555)100-0009',conf:'M-3009',pay:OPEN,price:0,  holes:'9H', playerStates:ps(2,false,-1)},
  {id:'p09',date:'2026-04-09',course:'ponds',slot:0,timeMin:392,name:'Diaz, M.',      players:3,cart:C,status:'booked',   phone:'(555)100-0010',conf:'R-3010',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'p10',date:'2026-04-09',course:'ponds',slot:2,timeMin:392,name:'Evans, J.',     players:2,cart:W,status:'booked',   phone:'(555)100-0011',conf:'R-3011',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p11',date:'2026-04-09',course:'ponds',slot:0,timeMin:400,name:'Torres, C.',    players:4,cart:C,status:'group',    phone:'(555)100-0012',conf:'G-3012',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,2)},
  {id:'p12',date:'2026-04-09',course:'ponds',slot:2,timeMin:400,name:'Patel, R.',     players:2,cart:W,status:'member',   phone:'(555)100-0013',conf:'M-3013',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p13',date:'2026-04-09',course:'ponds',slot:0,timeMin:408,name:'Lewis, K.',     players:2,cart:C,status:'booked',   phone:'(555)100-0014',conf:'R-3014',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'p14',date:'2026-04-09',course:'ponds',slot:2,timeMin:408,name:'Scott, B.',     players:3,cart:W,status:'walkin',   phone:'(555)100-0015',conf:'R-3015',pay:PAID,price:59, holes:'9H', playerStates:ps(3,true,1)},
  {id:'p15',date:'2026-04-09',course:'ponds',slot:0,timeMin:416,name:'King, D.',      players:4,cart:C,status:'group',    phone:'(555)100-0016',conf:'G-3016',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,0)},
  {id:'p16',date:'2026-04-09',course:'ponds',slot:1,timeMin:416,name:'Adams, F.',     players:2,cart:W,status:'member',   phone:'(555)100-0017',conf:'M-3017',pay:OPEN,price:0,  holes:'9H', playerStates:ps(2,false,-1)},
  {id:'p17',date:'2026-04-09',course:'ponds',slot:0,timeMin:424,name:'Green, T.',     players:4,cart:C,status:'booked',   phone:'(555)100-0019',conf:'R-3019',pay:PAID,price:100,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'p18',date:'2026-04-09',course:'ponds',slot:2,timeMin:424,name:'Hall, V.',      players:2,cart:W,status:'booked',   phone:'(555)100-0020',conf:'R-3020',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p19',date:'2026-04-09',course:'ponds',slot:0,timeMin:432,name:'White, E.',     players:3,cart:C,status:'member',   phone:'(555)100-0021',conf:'M-3021',pay:OPEN,price:0,  holes:'18H',playerStates:ps(3,false,-1)},
  {id:'p20',date:'2026-04-09',course:'ponds',slot:2,timeMin:432,name:'Carter, N.',    players:2,cart:W,status:'booked',   phone:'(555)100-0022',conf:'R-3022',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p21',date:'2026-04-09',course:'ponds',slot:0,timeMin:440,name:'Phillips, O.',  players:4,cart:C,status:'group',    phone:'(555)100-0023',conf:'G-3023',pay:PAID,price:120,holes:'18H',playerStates:ps(4,[true,true,true,false],-1)},
  {id:'p22',date:'2026-04-09',course:'ponds',slot:2,timeMin:448,name:'Campbell, U.',  players:2,cart:P,status:'booked',   phone:'(555)100-0024',conf:'R-3024',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'p23',date:'2026-04-09',course:'ponds',slot:0,timeMin:456,name:'Harmon, C.',    players:3,cart:C,status:'booked',   phone:'(555)100-0040',conf:'R-3040',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
  {id:'p24',date:'2026-04-09',course:'ponds',slot:0,timeMin:480,name:'Parker, Q.',    players:4,cart:C,status:'group',    phone:'(555)100-0025',conf:'G-3025',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'p25',date:'2026-04-09',course:'ponds',slot:1,timeMin:480,name:'Roberts, I.',   players:2,cart:W,status:'booked',   phone:'(555)100-0026',conf:'R-3026',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'p26',date:'2026-04-09',course:'ponds',slot:0,timeMin:496,name:'Turner, Y.',    players:3,cart:C,status:'member',   phone:'(555)100-0027',conf:'M-3027',pay:OPEN,price:0,  holes:'18H',playerStates:ps(3,false,-1)},
  {id:'p27',date:'2026-04-09',course:'ponds',slot:2,timeMin:496,name:'Nelson, Z.',    players:2,cart:W,status:'booked',   phone:'(555)100-0028',conf:'R-3028',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'p28',date:'2026-04-09',course:'ponds',slot:0,timeMin:512,name:'Chen, E.',      players:4,cart:C,status:'group',    phone:'(555)321-9876', conf:'G-3029',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'p29',date:'2026-04-09',course:'ponds',slot:0,timeMin:528,name:'Flores, M.',    players:2,cart:W,status:'booked',   phone:'(555)100-0030',conf:'R-3030',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p30',date:'2026-04-09',course:'ponds',slot:2,timeMin:528,name:'Okafor, T.',    players:2,cart:W,status:'walkin',   phone:'(555)100-0041',conf:'R-3041',pay:PAID,price:59, holes:'9H', playerStates:ps(2,true,-1)},
  {id:'p31',date:'2026-04-09',course:'ponds',slot:0,timeMin:544,name:'Huang, L.',     players:3,cart:C,status:'booked',   phone:'(555)100-0042',conf:'R-3042',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'p32',date:'2026-04-09',course:'ponds',slot:2,timeMin:560,name:'Brennan, K.',   players:4,cart:C,status:'group',    phone:'(555)100-0043',conf:'G-3043',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'p33',date:'2026-04-09',course:'ponds',slot:0,timeMin:576,name:'Yusuf, A.',     players:2,cart:W,status:'booked',   phone:'(555)100-0044',conf:'R-3044',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p34',date:'2026-04-09',course:'ponds',slot:0,timeMin:600,name:'Nakamura, S.',  players:4,cart:C,status:'group',    phone:'(555)100-0045',conf:'G-3045',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'p35',date:'2026-04-09',course:'ponds',slot:0,timeMin:616,name:'Vega, R.',      players:2,cart:W,status:'booked',   phone:'(555)100-0046',conf:'R-3046',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'p36',date:'2026-04-09',course:'ponds',slot:2,timeMin:616,name:'Drummond, P.',  players:3,cart:C,status:'member',   phone:'(555)100-0047',conf:'M-3047',pay:OPEN,price:0,  holes:'18H',playerStates:ps(3,false,-1)},
  {id:'p37',date:'2026-04-09',course:'ponds',slot:0,timeMin:632,name:'Quinn, M.',     players:2,cart:W,status:'booked',   phone:'(555)100-0048',conf:'R-3048',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'p38',date:'2026-04-09',course:'ponds',slot:0,timeMin:648,name:'Ashby, T.',     players:4,cart:C,status:'group',    phone:'(555)100-0049',conf:'G-3049',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'p39',date:'2026-04-09',course:'ponds',slot:0,timeMin:680,name:'Ingram, B.',    players:2,cart:W,status:'booked',   phone:'(555)100-0050',conf:'R-3050',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'p40',date:'2026-04-09',course:'ponds',slot:2,timeMin:680,name:'Osei, C.',      players:3,cart:C,status:'booked',   phone:'(555)100-0051',conf:'R-3051',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'p41',date:'2026-04-09',course:'ponds',slot:0,timeMin:720,name:'Morales, D.',   players:4,cart:C,status:'group',    phone:'(555)100-0052',conf:'G-3052',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'p42',date:'2026-04-09',course:'ponds',slot:0,timeMin:756,name:'Strand, E.',    players:2,cart:W,status:'booked',   phone:'(555)100-0053',conf:'R-3053',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'p43',date:'2026-04-09',course:'ponds',slot:0,timeMin:840,name:'Morris, G.',    players:2,cart:W,status:'walkin',   phone:'(555)100-0029',conf:'R-3029',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
  {id:'p44',date:'2026-04-09',course:'ponds',slot:2,timeMin:840,name:'Rogers, X.',    players:4,cart:C,status:'booked',   phone:'(555)100-0031',conf:'R-3031',pay:OPEN,price:100,holes:'9H', playerStates:ps(4,false,-1)},
  {id:'p45',date:'2026-04-09',course:'ponds',slot:0,timeMin:856,name:'Cook, W.',      players:1,cart:W,status:'walkin',   phone:'(555)100-0032',conf:'R-3032',pay:PAID,price:29, holes:'9H', playerStates:ps(1,true,-1)},
  {id:'p46',date:'2026-04-09',course:'ponds',slot:1,timeMin:856,name:'Reed, J.',      players:3,cart:C,status:'booked',   phone:'(555)100-0033',conf:'R-3033',pay:PAID,price:100,holes:'9H', playerStates:ps(3,true,-1)},
  {id:'p47',date:'2026-04-09',course:'ponds',slot:0,timeMin:872,name:'Lowe, F.',      players:2,cart:W,status:'walkin',   phone:'(555)100-0054',conf:'R-3054',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
  {id:'p48',date:'2026-04-09',course:'ponds',slot:2,timeMin:872,name:'Tate, G.',      players:4,cart:C,status:'group',    phone:'(555)100-0055',conf:'G-3055',pay:PAID,price:120,holes:'9H', playerStates:ps(4,true,-1)},
  {id:'p49',date:'2026-04-09',course:'ponds',slot:0,timeMin:888,name:'Holt, H.',      players:2,cart:P,status:'booked',   phone:'(555)100-0056',conf:'R-3056',pay:OPEN,price:100,holes:'9H', playerStates:ps(2,false,-1)},
  {id:'p50',date:'2026-04-09',course:'ponds',slot:0,timeMin:960,name:'Greer, I.',     players:3,cart:C,status:'booked',   phone:'(555)100-0057',conf:'R-3057',pay:PAID,price:100,holes:'9H', playerStates:ps(3,true,-1)},

  /* ── VALLEY ── */
  {id:'v01',date:'2026-04-09',course:'valley',slot:0,timeMin:360,name:'Simmons, A.',  players:4,cart:C,status:'group',    phone:'(555)200-0001',conf:'G-4001',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,1)},
  {id:'v02',date:'2026-04-09',course:'valley',slot:2,timeMin:360,name:'Brooks, K.',   players:2,cart:W,status:'member',   phone:'(555)200-0002',conf:'M-4002',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
  {id:'v03',date:'2026-04-09',course:'valley',slot:0,timeMin:368,name:'Sanders, P.',  players:3,cart:C,status:'booked',   phone:'(555)200-0003',conf:'R-4003',pay:PAID,price:100,holes:'18H',note:'Needs accessible cart — knee injury',playerStates:ps(3,true,-1)},
  {id:'v04',date:'2026-04-09',course:'valley',slot:2,timeMin:368,name:'Price, L.',    players:2,cart:P,status:'walkin',   phone:'(555)200-0004',conf:'R-4004',pay:PAID,price:59, holes:'9H', playerStates:ps(2,true,0)},
  {id:'v05',date:'2026-04-09',course:'valley',slot:0,timeMin:376,name:'Barnes, C.',   players:4,cart:C,status:'group',    phone:'(555)200-0005',conf:'G-4005',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,2)},
  {id:'v06',date:'2026-04-09',course:'valley',slot:0,timeMin:384,name:'Chen, E.',     players:4,cart:C,status:'member',   phone:'(555)321-9876', conf:'M-0412',pay:OPEN,price:0,  holes:'18H',playerStates:ps(4,false,-1)},
  {id:'v07',date:'2026-04-09',course:'valley',slot:0,timeMin:392,name:'Williams, D.', players:2,cart:W,status:'booked',   phone:'(555)654-3210', conf:'R-2901',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'v08',date:'2026-04-09',course:'valley',slot:2,timeMin:400,name:'Hughes, M.',   players:2,cart:W,status:'booked',   phone:'(555)200-0009',conf:'R-4009',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'v09',date:'2026-04-09',course:'valley',slot:0,timeMin:408,name:'Flores, D.',   players:4,cart:C,status:'group',    phone:'(555)200-0010',conf:'G-4010',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'v10',date:'2026-04-09',course:'valley',slot:1,timeMin:408,name:'Washington, T.',players:2,cart:W,status:'member',  phone:'(555)200-0011',conf:'M-4011',pay:OPEN,price:0,  holes:'9H', playerStates:ps(2,false,-1)},
  {id:'v11',date:'2026-04-09',course:'valley',slot:0,timeMin:416,name:'Butler, R.',   players:3,cart:C,status:'booked',   phone:'(555)200-0012',conf:'R-4012',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'v12',date:'2026-04-09',course:'valley',slot:2,timeMin:416,name:'Stewart, O.',  players:2,cart:W,status:'booked',   phone:'(555)200-0013',conf:'R-4013',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'v13',date:'2026-04-09',course:'valley',slot:0,timeMin:424,name:'Sanchez, F.',  players:4,cart:C,status:'group',    phone:'(555)200-0014',conf:'G-4014',pay:PAID,price:120,holes:'18H',playerStates:ps(4,[true,true,false,true],-1)},
  {id:'v14',date:'2026-04-09',course:'valley',slot:0,timeMin:432,name:'Johnson, S.',  players:3,cart:C,status:'checkedin',phone:'(555)987-6543', conf:'M-0318',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,0)},
  {id:'v15',date:'2026-04-09',course:'valley',slot:0,timeMin:440,name:'Perez, G.',    players:2,cart:W,status:'booked',   phone:'(555)200-0015',conf:'R-4015',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'v16',date:'2026-04-09',course:'valley',slot:1,timeMin:440,name:'Long, H.',     players:3,cart:C,status:'member',   phone:'(555)200-0016',conf:'M-4016',pay:OPEN,price:0,  holes:'18H',playerStates:ps(3,false,-1)},
  {id:'v17',date:'2026-04-09',course:'valley',slot:0,timeMin:456,name:'Rivera, I.',   players:4,cart:C,status:'group',    phone:'(555)200-0017',conf:'G-4017',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'v18',date:'2026-04-09',course:'valley',slot:2,timeMin:456,name:'Wood, J.',     players:2,cart:W,status:'booked',   phone:'(555)200-0018',conf:'R-4018',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'v19',date:'2026-04-09',course:'valley',slot:0,timeMin:480,name:'James, K.',    players:2,cart:W,status:'booked',   phone:'(555)200-0019',conf:'R-4019',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'v20',date:'2026-04-09',course:'valley',slot:0,timeMin:496,name:'Nguyen, L.',   players:4,cart:C,status:'group',    phone:'(555)200-0020',conf:'G-4020',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'v21',date:'2026-04-09',course:'valley',slot:0,timeMin:512,name:'Zhao, M.',     players:3,cart:C,status:'booked',   phone:'(555)200-0021',conf:'R-4021',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'v22',date:'2026-04-09',course:'valley',slot:2,timeMin:528,name:'Okonkwo, N.',  players:2,cart:W,status:'member',   phone:'(555)400-0011',conf:'M-4022',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
  {id:'v23',date:'2026-04-09',course:'valley',slot:0,timeMin:544,name:'Reyes, O.',    players:4,cart:C,status:'group',    phone:'(555)200-0023',conf:'G-4023',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'v24',date:'2026-04-09',course:'valley',slot:0,timeMin:560,name:'Kowalski, P.', players:2,cart:W,status:'booked',   phone:'(555)200-0024',conf:'R-4024',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'v25',date:'2026-04-09',course:'valley',slot:0,timeMin:576,name:'Delgado, Q.',  players:3,cart:C,status:'booked',   phone:'(555)200-0025',conf:'R-4025',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'v26',date:'2026-04-09',course:'valley',slot:0,timeMin:600,name:'Tanaka, R.',   players:4,cart:C,status:'group',    phone:'(555)200-0026',conf:'G-4026',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'v27',date:'2026-04-09',course:'valley',slot:2,timeMin:600,name:'Nkosi, S.',    players:2,cart:W,status:'booked',   phone:'(555)200-0027',conf:'R-4027',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'v28',date:'2026-04-09',course:'valley',slot:0,timeMin:616,name:'Ivanova, T.',  players:3,cart:C,status:'member',   phone:'(555)200-0028',conf:'M-4028',pay:OPEN,price:0,  holes:'18H',playerStates:ps(3,false,-1)},
  {id:'v29',date:'2026-04-09',course:'valley',slot:0,timeMin:632,name:'Patel, P.',    players:4,cart:C,status:'group',    phone:'(555)400-0012',conf:'G-4029',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'v30',date:'2026-04-09',course:'valley',slot:0,timeMin:648,name:'Russo, A.',    players:2,cart:W,status:'booked',   phone:'(555)400-0014',conf:'R-4030',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'v31',date:'2026-04-09',course:'valley',slot:0,timeMin:680,name:'Brennan, U.',  players:3,cart:C,status:'booked',   phone:'(555)200-0031',conf:'R-4031',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'v32',date:'2026-04-09',course:'valley',slot:2,timeMin:680,name:'Lim, V.',      players:2,cart:W,status:'booked',   phone:'(555)200-0032',conf:'R-4032',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'v33',date:'2026-04-09',course:'valley',slot:0,timeMin:720,name:'Okeke, W.',    players:4,cart:C,status:'group',    phone:'(555)200-0033',conf:'G-4033',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'v34',date:'2026-04-09',course:'valley',slot:0,timeMin:756,name:'Stern, X.',    players:2,cart:W,status:'booked',   phone:'(555)200-0034',conf:'R-4034',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'v35',date:'2026-04-09',course:'valley',slot:0,timeMin:840,name:'Scott, L.',    players:4,cart:C,status:'booked',   phone:'(555)200-0035',conf:'R-4035',pay:PAID,price:100,holes:'9H', playerStates:ps(4,true,-1)},
  {id:'v36',date:'2026-04-09',course:'valley',slot:0,timeMin:856,name:'Hill, M.',     players:3,cart:C,status:'booked',   phone:'(555)200-0036',conf:'R-4036',pay:PAID,price:100,holes:'9H', playerStates:ps(3,true,-1)},
  {id:'v37',date:'2026-04-09',course:'valley',slot:2,timeMin:856,name:'Young, N.',    players:2,cart:W,status:'walkin',   phone:'(555)200-0037',conf:'R-4037',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
  {id:'v38',date:'2026-04-09',course:'valley',slot:0,timeMin:872,name:'James, O.',    players:2,cart:W,status:'walkin',   phone:'(555)200-0038',conf:'R-4038',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
  {id:'v39',date:'2026-04-09',course:'valley',slot:0,timeMin:888,name:'Cruz, P.',     players:4,cart:C,status:'group',    phone:'(555)200-0039',conf:'G-4039',pay:PAID,price:120,holes:'9H', playerStates:ps(4,true,-1)},
  {id:'v40',date:'2026-04-09',course:'valley',slot:0,timeMin:960,name:'Kim, Q.',      players:2,cart:W,status:'booked',   phone:'(555)200-0040',conf:'R-4040',pay:OPEN,price:100,holes:'9H', playerStates:ps(2,false,-1)},

  /* ── ROLLING ── */
  {id:'r01',date:'2026-04-09',course:'rolling',slot:0,timeMin:360,name:'Allen, O.',   players:4,cart:C,status:'group',    phone:'(555)300-0001',conf:'G-5001',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,0)},
  {id:'r02',date:'2026-04-09',course:'rolling',slot:2,timeMin:360,name:'Wright, P.',  players:2,cart:W,status:'member',   phone:'(555)300-0002',conf:'M-5002',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
  {id:'r03',date:'2026-04-09',course:'rolling',slot:0,timeMin:368,name:'Lopez, Q.',   players:3,cart:C,status:'booked',   phone:'(555)300-0003',conf:'R-5003',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'r04',date:'2026-04-09',course:'rolling',slot:2,timeMin:368,name:'Hill, R.',    players:2,cart:W,status:'walkin',   phone:'(555)300-0004',conf:'R-5004',pay:PAID,price:59, holes:'9H', playerStates:ps(2,true,1)},
  {id:'r05',date:'2026-04-09',course:'rolling',slot:0,timeMin:376,name:'Martinez, R.',players:2,cart:W,status:'booked',   phone:'(555)456-7890', conf:'R-2855',pay:NS,  price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'r06',date:'2026-04-09',course:'rolling',slot:2,timeMin:376,name:'Coleman, D.', players:2,cart:C,status:'booked',   phone:'(555)456-1234', conf:'R-2856',pay:OPEN,price:100,holes:'9H', playerStates:ps(2,false,-1)},
  {id:'r07',date:'2026-04-09',course:'rolling',slot:0,timeMin:384,name:'Brown, J.',   players:4,cart:C,status:'group',    phone:'(555)111-2222', conf:'G-0091',pay:NS,  price:100,holes:'18H',playerStates:ps(4,false,-1)},
  {id:'r08',date:'2026-04-09',course:'rolling',slot:2,timeMin:384,name:'Avery, S.',   players:2,cart:W,status:'booked',   phone:'(555)111-3333', conf:'R-0092',pay:REF, price:59, holes:'9H', playerStates:ps(2,false,-1)},
  {id:'r09',date:'2026-04-09',course:'rolling',slot:0,timeMin:392,name:'Lee, S.',     players:2,cart:C,status:'booked',   phone:'(555)300-0007',conf:'R-5007',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'r10',date:'2026-04-09',course:'rolling',slot:2,timeMin:392,name:'Harris, T.',  players:3,cart:W,status:'booked',   phone:'(555)300-0008',conf:'R-5008',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
  {id:'r11',date:'2026-04-09',course:'rolling',slot:0,timeMin:400,name:'Thompson, M.',players:1,cart:W,status:'member',   phone:'(555)234-1234', conf:'M-0205',pay:PAID,price:0,  holes:'18H',playerStates:ps(1,true,-1)},
  {id:'r12',date:'2026-04-09',course:'rolling',slot:2,timeMin:400,name:'Jackson, U.', players:4,cart:C,status:'group',    phone:'(555)300-0010',conf:'G-5010',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,0)},
  {id:'r13',date:'2026-04-09',course:'rolling',slot:0,timeMin:408,name:'Lewis, V.',   players:2,cart:W,status:'booked',   phone:'(555)300-0011',conf:'R-5011',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'r14',date:'2026-04-09',course:'rolling',slot:2,timeMin:408,name:'Robinson, W.',players:4,cart:C,status:'group',    phone:'(555)300-0012',conf:'G-5012',pay:PAID,price:120,holes:'18H',playerStates:ps(4,[true,false,true,true],-1)},
  {id:'r15',date:'2026-04-09',course:'rolling',slot:0,timeMin:416,name:'Walker, X.',  players:3,cart:C,status:'booked',   phone:'(555)300-0013',conf:'R-5013',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'r16',date:'2026-04-09',course:'rolling',slot:2,timeMin:416,name:'Perez, Y.',   players:2,cart:W,status:'member',   phone:'(555)300-0014',conf:'M-5014',pay:OPEN,price:0,  holes:'9H', playerStates:ps(2,false,-1)},
  {id:'r17',date:'2026-04-09',course:'rolling',slot:0,timeMin:424,name:'Hall, Z.',    players:4,cart:C,status:'group',    phone:'(555)300-0015',conf:'G-5015',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'r18',date:'2026-04-09',course:'rolling',slot:0,timeMin:432,name:'Young, A.',   players:2,cart:W,status:'booked',   phone:'(555)300-0016',conf:'R-5016',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'r19',date:'2026-04-09',course:'rolling',slot:1,timeMin:432,name:'King, B.',    players:4,cart:C,status:'group',    phone:'(555)300-0017',conf:'G-5017',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'r20',date:'2026-04-09',course:'rolling',slot:0,timeMin:440,name:'Scott, C.',   players:3,cart:C,status:'member',   phone:'(555)300-0018',conf:'M-5018',pay:OPEN,price:0,  holes:'18H',playerStates:ps(3,false,-1)},
  {id:'r21',date:'2026-04-09',course:'rolling',slot:2,timeMin:440,name:'Adams, D.',   players:2,cart:W,status:'booked',   phone:'(555)300-0019',conf:'R-5019',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'r22',date:'2026-04-09',course:'rolling',slot:0,timeMin:448,name:'Baker, E.',   players:4,cart:C,status:'group',    phone:'(555)300-0020',conf:'G-5020',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'r23',date:'2026-04-09',course:'rolling',slot:0,timeMin:456,name:'Flores, F.',  players:2,cart:W,status:'booked',   phone:'(555)300-0021',conf:'R-5021',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'r24',date:'2026-04-09',course:'rolling',slot:2,timeMin:456,name:'Garcia, G.',  players:3,cart:C,status:'booked',   phone:'(555)300-0022',conf:'R-5022',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'r25',date:'2026-04-09',course:'rolling',slot:0,timeMin:480,name:'Hernandez, H.',players:4,cart:C,status:'group',   phone:'(555)300-0023',conf:'G-5023',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'r26',date:'2026-04-09',course:'rolling',slot:0,timeMin:496,name:'Jackson, I.', players:2,cart:W,status:'booked',   phone:'(555)300-0024',conf:'R-5024',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
  {id:'r27',date:'2026-04-09',course:'rolling',slot:2,timeMin:512,name:'Kim, J.',     players:3,cart:C,status:'booked',   phone:'(555)300-0025',conf:'R-5025',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'r28',date:'2026-04-09',course:'rolling',slot:0,timeMin:528,name:'Lopez, K.',   players:4,cart:C,status:'group',    phone:'(555)300-0026',conf:'G-5026',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'r29',date:'2026-04-09',course:'rolling',slot:0,timeMin:544,name:'Mendez, L.',  players:2,cart:W,status:'booked',   phone:'(555)300-0027',conf:'R-5027',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'r30',date:'2026-04-09',course:'rolling',slot:0,timeMin:560,name:'Nguyen, M.',  players:3,cart:C,status:'member',   phone:'(555)400-0007',conf:'M-5028',pay:OPEN,price:0,  holes:'18H',playerStates:ps(3,false,-1)},
  {id:'r31',date:'2026-04-09',course:'rolling',slot:0,timeMin:576,name:'Ortiz, N.',   players:4,cart:C,status:'group',    phone:'(555)300-0029',conf:'G-5029',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'r32',date:'2026-04-09',course:'rolling',slot:0,timeMin:600,name:'Park, O.',    players:2,cart:W,status:'booked',   phone:'(555)300-0030',conf:'R-5030',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'r33',date:'2026-04-09',course:'rolling',slot:2,timeMin:600,name:'Quinn, P.',   players:3,cart:C,status:'booked',   phone:'(555)300-0031',conf:'R-5031',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
  {id:'r34',date:'2026-04-09',course:'rolling',slot:0,timeMin:616,name:'Ramirez, Q.', players:4,cart:C,status:'group',    phone:'(555)300-0032',conf:'G-5032',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'r35',date:'2026-04-09',course:'rolling',slot:0,timeMin:632,name:'Silva, R.',   players:2,cart:W,status:'booked',   phone:'(555)300-0033',conf:'R-5033',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'r36',date:'2026-04-09',course:'rolling',slot:0,timeMin:648,name:'Torres, S.',  players:3,cart:C,status:'booked',   phone:'(555)300-0034',conf:'R-5034',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
  {id:'r37',date:'2026-04-09',course:'rolling',slot:0,timeMin:680,name:'Ueda, T.',    players:4,cart:C,status:'group',    phone:'(555)300-0035',conf:'G-5035',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
  {id:'r38',date:'2026-04-09',course:'rolling',slot:0,timeMin:720,name:'Vance, U.',   players:2,cart:W,status:'booked',   phone:'(555)300-0036',conf:'R-5036',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
  {id:'r39',date:'2026-04-09',course:'rolling',slot:0,timeMin:756,name:'Walsh, V.',   players:3,cart:C,status:'booked',   phone:'(555)300-0037',conf:'R-5037',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
  {id:'r40',date:'2026-04-09',course:'rolling',slot:0,timeMin:840,name:'Nelson, F.',  players:2,cart:W,status:'walkin',   phone:'(555)300-0038',conf:'R-5038',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
  {id:'r41',date:'2026-04-09',course:'rolling',slot:1,timeMin:840,name:'Carter, G.',  players:3,cart:C,status:'booked',   phone:'(555)300-0039',conf:'R-5039',pay:PAID,price:100,holes:'9H', playerStates:ps(3,true,-1)},
  {id:'r42',date:'2026-04-09',course:'rolling',slot:0,timeMin:856,name:'Mitchell, H.',players:4,cart:C,status:'group',    phone:'(555)300-0040',conf:'G-5040',pay:PAID,price:120,holes:'9H', playerStates:ps(4,[true,true,true,false],-1)},
  {id:'r43',date:'2026-04-09',course:'rolling',slot:2,timeMin:856,name:'Perez, I.',   players:2,cart:W,status:'walkin',   phone:'(555)300-0041',conf:'R-5041',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
  {id:'r44',date:'2026-04-09',course:'rolling',slot:0,timeMin:872,name:'Evans, J.',   players:2,cart:W,status:'walkin',   phone:'(555)300-0042',conf:'R-5042',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
  {id:'r45',date:'2026-04-09',course:'rolling',slot:0,timeMin:960,name:'Ford, K.',    players:3,cart:C,status:'booked',   phone:'(555)300-0043',conf:'R-5043',pay:OPEN,price:100,holes:'9H', playerStates:ps(3,false,-1)},
  ];

  // ── FRI Apr 10 ──
  const fri: Booking[] = [
    {id:'f01',date:'2026-04-10',course:'ponds', slot:0,timeMin:360,name:'Morrison, A.',players:4,cart:C,status:'group',   phone:'(555)400-0001',conf:'G-6001',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f02',date:'2026-04-10',course:'ponds', slot:2,timeMin:360,name:'Blake, E.',   players:2,cart:W,status:'member',  phone:'(555)400-0001',conf:'M-6002',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f03',date:'2026-04-10',course:'ponds', slot:0,timeMin:376,name:'Novak, C.',   players:2,cart:W,status:'member',  phone:'(555)400-0002',conf:'M-6003',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f04',date:'2026-04-10',course:'ponds', slot:2,timeMin:376,name:'Harrington, C.',players:3,cart:C,status:'booked',phone:'(555)400-0009',conf:'R-6004',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'f05',date:'2026-04-10',course:'ponds', slot:0,timeMin:392,name:'Kim, D.',     players:4,cart:C,status:'group',   phone:'(555)400-0005',conf:'G-6005',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f06',date:'2026-04-10',course:'ponds', slot:0,timeMin:408,name:'Walsh, P.',   players:2,cart:W,status:'member',  phone:'(555)400-0008',conf:'M-6006',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f07',date:'2026-04-10',course:'ponds', slot:2,timeMin:408,name:'Torres, M.',  players:3,cart:C,status:'booked',  phone:'(555)400-0006',conf:'R-6007',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
    {id:'f08',date:'2026-04-10',course:'ponds', slot:0,timeMin:424,name:'Delgado, A.', players:4,cart:C,status:'group',   phone:'(555)400-0010',conf:'G-6008',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f09',date:'2026-04-10',course:'ponds', slot:0,timeMin:440,name:'Okonkwo, J.', players:2,cart:W,status:'member',  phone:'(555)400-0011',conf:'M-6009',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f10',date:'2026-04-10',course:'ponds', slot:0,timeMin:480,name:'Patel, Pr.',  players:4,cart:C,status:'group',   phone:'(555)400-0012',conf:'G-6010',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f11',date:'2026-04-10',course:'ponds', slot:0,timeMin:600,name:'Russo, A.',   players:3,cart:C,status:'booked',  phone:'(555)400-0014',conf:'R-6011',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'f12',date:'2026-04-10',course:'ponds', slot:0,timeMin:840,name:'Yuen, M.',    players:2,cart:W,status:'walkin',  phone:'(555)400-0017',conf:'R-6012',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
    {id:'f13',date:'2026-04-10',course:'valley',slot:0,timeMin:360,name:'Flanagan, D.',players:4,cart:C,status:'group',   phone:'(555)400-0016',conf:'G-6013',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f14',date:'2026-04-10',course:'valley',slot:2,timeMin:360,name:'Whitfield, G.',players:2,cart:W,status:'member', phone:'(555)400-0015',conf:'M-6014',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f15',date:'2026-04-10',course:'valley',slot:0,timeMin:376,name:'Park, S.',    players:3,cart:C,status:'booked',  phone:'(555)400-0004',conf:'R-6015',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'f16',date:'2026-04-10',course:'valley',slot:0,timeMin:392,name:'Okafor, J.',  players:4,cart:C,status:'group',   phone:'(555)400-0003',conf:'G-6016',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f17',date:'2026-04-10',course:'valley',slot:0,timeMin:416,name:'Brooks, K.',  players:2,cart:W,status:'member',  phone:'(555)400-0013',conf:'M-6017',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f18',date:'2026-04-10',course:'valley',slot:0,timeMin:440,name:'Simms, T.',   players:4,cart:C,status:'booked',  phone:'(555)501-0001',conf:'R-6018',pay:PAID,price:100,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f19',date:'2026-04-10',course:'valley',slot:0,timeMin:480,name:'Carver, B.',  players:3,cart:C,status:'group',   phone:'(555)501-0002',conf:'G-6019',pay:PAID,price:120,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'f20',date:'2026-04-10',course:'valley',slot:0,timeMin:600,name:'Hoang, L.',   players:2,cart:W,status:'booked',  phone:'(555)501-0003',conf:'R-6020',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f21',date:'2026-04-10',course:'valley',slot:0,timeMin:840,name:'Penn, R.',    players:3,cart:C,status:'booked',  phone:'(555)501-0004',conf:'R-6021',pay:PAID,price:100,holes:'9H', playerStates:ps(3,true,-1)},
    {id:'f22',date:'2026-04-10',course:'rolling',slot:0,timeMin:360,name:'Zhao, W.',   players:4,cart:C,status:'group',   phone:'(555)501-0005',conf:'G-6022',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f23',date:'2026-04-10',course:'rolling',slot:2,timeMin:360,name:'Sharma, P.', players:2,cart:W,status:'member',  phone:'(555)400-0018',conf:'M-6023',pay:OPEN,price:0,  holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f24',date:'2026-04-10',course:'rolling',slot:0,timeMin:384,name:'Dawson, C.', players:3,cart:C,status:'booked',  phone:'(555)501-0006',conf:'R-6024',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'f25',date:'2026-04-10',course:'rolling',slot:0,timeMin:408,name:'Voss, M.',   players:4,cart:C,status:'group',   phone:'(555)501-0007',conf:'G-6025',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f26',date:'2026-04-10',course:'rolling',slot:0,timeMin:440,name:'Crane, L.',  players:2,cart:W,status:'booked',  phone:'(555)501-0008',conf:'R-6026',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
    {id:'f27',date:'2026-04-10',course:'rolling',slot:0,timeMin:480,name:'Stone, T.',  players:3,cart:C,status:'booked',  phone:'(555)501-0009',conf:'R-6027',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'f28',date:'2026-04-10',course:'rolling',slot:0,timeMin:600,name:'Wade, K.',   players:4,cart:C,status:'group',   phone:'(555)501-0010',conf:'G-6028',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'f29',date:'2026-04-10',course:'rolling',slot:0,timeMin:840,name:'Cross, J.',  players:2,cart:W,status:'walkin',  phone:'(555)501-0011',conf:'R-6029',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
    {id:'f30',date:'2026-04-10',course:'rolling',slot:0,timeMin:856,name:'Ford, M.',   players:3,cart:C,status:'booked',  phone:'(555)501-0012',conf:'R-6030',pay:PAID,price:100,holes:'9H', playerStates:ps(3,true,-1)},
  ];
  // ── SAT Apr 11 ──
  const sat: Booking[] = [
    {id:'s01',date:'2026-04-11',course:'ponds', slot:0,timeMin:360,name:'Hunt, A.',    players:4,cart:C,status:'group',   phone:'(555)502-0001',conf:'G-7001',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s02',date:'2026-04-11',course:'ponds', slot:2,timeMin:360,name:'Moss, B.',    players:2,cart:W,status:'booked',  phone:'(555)502-0002',conf:'R-7002',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
    {id:'s03',date:'2026-04-11',course:'ponds', slot:0,timeMin:368,name:'Lane, C.',    players:3,cart:C,status:'booked',  phone:'(555)502-0003',conf:'R-7003',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'s04',date:'2026-04-11',course:'ponds', slot:0,timeMin:376,name:'Grant, D.',   players:4,cart:C,status:'group',   phone:'(555)502-0004',conf:'G-7004',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s05',date:'2026-04-11',course:'ponds', slot:0,timeMin:384,name:'Webb, E.',    players:2,cart:W,status:'booked',  phone:'(555)502-0005',conf:'R-7005',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'s06',date:'2026-04-11',course:'ponds', slot:2,timeMin:384,name:'Burke, F.',   players:3,cart:C,status:'booked',  phone:'(555)502-0006',conf:'R-7006',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
    {id:'s07',date:'2026-04-11',course:'ponds', slot:0,timeMin:392,name:'Nash, G.',    players:4,cart:C,status:'group',   phone:'(555)502-0007',conf:'G-7007',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s08',date:'2026-04-11',course:'ponds', slot:0,timeMin:408,name:'Fox, H.',     players:2,cart:W,status:'booked',  phone:'(555)502-0008',conf:'R-7008',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'s09',date:'2026-04-11',course:'ponds', slot:0,timeMin:424,name:'Ray, I.',     players:4,cart:C,status:'group',   phone:'(555)502-0009',conf:'G-7009',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s10',date:'2026-04-11',course:'ponds', slot:0,timeMin:440,name:'Day, J.',     players:3,cart:C,status:'booked',  phone:'(555)502-0010',conf:'R-7010',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
    {id:'s11',date:'2026-04-11',course:'ponds', slot:0,timeMin:480,name:'Roy, K.',     players:4,cart:C,status:'group',   phone:'(555)502-0011',conf:'G-7011',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s12',date:'2026-04-11',course:'ponds', slot:0,timeMin:600,name:'Key, L.',     players:2,cart:W,status:'booked',  phone:'(555)502-0012',conf:'R-7012',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'s13',date:'2026-04-11',course:'ponds', slot:0,timeMin:840,name:'Jay, M.',     players:3,cart:C,status:'walkin',  phone:'(555)502-0013',conf:'R-7013',pay:PAID,price:59, holes:'9H', playerStates:ps(3,true,-1)},
    {id:'s14',date:'2026-04-11',course:'valley',slot:0,timeMin:360,name:'Bay, N.',     players:4,cart:C,status:'group',   phone:'(555)502-0014',conf:'G-7014',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s15',date:'2026-04-11',course:'valley',slot:0,timeMin:376,name:'May, O.',     players:2,cart:W,status:'booked',  phone:'(555)502-0015',conf:'R-7015',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'s16',date:'2026-04-11',course:'valley',slot:0,timeMin:392,name:'Clay, P.',    players:4,cart:C,status:'group',   phone:'(555)502-0016',conf:'G-7016',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s17',date:'2026-04-11',course:'valley',slot:0,timeMin:408,name:'Gray, Q.',    players:3,cart:C,status:'booked',  phone:'(555)502-0017',conf:'R-7017',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
    {id:'s18',date:'2026-04-11',course:'valley',slot:0,timeMin:440,name:'Fay, R.',     players:4,cart:C,status:'group',   phone:'(555)502-0018',conf:'G-7018',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s19',date:'2026-04-11',course:'valley',slot:0,timeMin:480,name:'Way, S.',     players:2,cart:W,status:'booked',  phone:'(555)502-0019',conf:'R-7019',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'s20',date:'2026-04-11',course:'valley',slot:0,timeMin:600,name:'Hay, T.',     players:4,cart:C,status:'group',   phone:'(555)502-0020',conf:'G-7020',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s21',date:'2026-04-11',course:'valley',slot:0,timeMin:840,name:'Kay, U.',     players:2,cart:W,status:'walkin',  phone:'(555)502-0021',conf:'R-7021',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
    {id:'s22',date:'2026-04-11',course:'rolling',slot:0,timeMin:360,name:'Loy, V.',    players:4,cart:C,status:'group',   phone:'(555)502-0022',conf:'G-7022',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s23',date:'2026-04-11',course:'rolling',slot:0,timeMin:376,name:'Coy, W.',    players:3,cart:C,status:'booked',  phone:'(555)502-0023',conf:'R-7023',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'s24',date:'2026-04-11',course:'rolling',slot:0,timeMin:392,name:'Toy, X.',    players:4,cart:C,status:'group',   phone:'(555)502-0024',conf:'G-7024',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s25',date:'2026-04-11',course:'rolling',slot:0,timeMin:408,name:'Joy, Y.',    players:2,cart:W,status:'booked',  phone:'(555)502-0025',conf:'R-7025',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'s26',date:'2026-04-11',course:'rolling',slot:0,timeMin:440,name:'Boy, Z.',    players:4,cart:C,status:'group',   phone:'(555)502-0026',conf:'G-7026',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s27',date:'2026-04-11',course:'rolling',slot:0,timeMin:480,name:'Ace, A.',    players:3,cart:C,status:'booked',  phone:'(555)502-0027',conf:'R-7027',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
    {id:'s28',date:'2026-04-11',course:'rolling',slot:0,timeMin:600,name:'Ice, B.',    players:4,cart:C,status:'group',   phone:'(555)502-0028',conf:'G-7028',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'s29',date:'2026-04-11',course:'rolling',slot:0,timeMin:840,name:'Vice, C.',   players:2,cart:W,status:'walkin',  phone:'(555)502-0029',conf:'R-7029',pay:PAID,price:29, holes:'9H', playerStates:ps(2,true,-1)},
  ];
  // ── SUN Apr 12 ──
  const sun: Booking[] = [
    {id:'u01',date:'2026-04-12',course:'ponds', slot:0,timeMin:360,name:'Dunn, A.',    players:4,cart:C,status:'group',   phone:'(555)503-0001',conf:'G-8001',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u02',date:'2026-04-12',course:'ponds', slot:2,timeMin:360,name:'Penn, B.',    players:2,cart:W,status:'booked',  phone:'(555)503-0002',conf:'R-8002',pay:OPEN,price:100,holes:'18H',playerStates:ps(2,false,-1)},
    {id:'u03',date:'2026-04-12',course:'ponds', slot:0,timeMin:376,name:'Finn, C.',    players:3,cart:C,status:'booked',  phone:'(555)503-0003',conf:'R-8003',pay:PAID,price:100,holes:'18H',playerStates:ps(3,true,-1)},
    {id:'u04',date:'2026-04-12',course:'ponds', slot:0,timeMin:392,name:'Gunn, D.',    players:4,cart:C,status:'group',   phone:'(555)503-0004',conf:'G-8004',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u05',date:'2026-04-12',course:'ponds', slot:0,timeMin:408,name:'Munn, E.',    players:2,cart:W,status:'booked',  phone:'(555)503-0005',conf:'R-8005',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'u06',date:'2026-04-12',course:'ponds', slot:0,timeMin:424,name:'Wynn, F.',    players:4,cart:C,status:'group',   phone:'(555)503-0006',conf:'G-8006',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u07',date:'2026-04-12',course:'ponds', slot:0,timeMin:440,name:'Benn, G.',    players:3,cart:C,status:'booked',  phone:'(555)503-0007',conf:'R-8007',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
    {id:'u08',date:'2026-04-12',course:'ponds', slot:0,timeMin:480,name:'Cann, H.',    players:4,cart:C,status:'group',   phone:'(555)503-0008',conf:'G-8008',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u09',date:'2026-04-12',course:'ponds', slot:0,timeMin:600,name:'Dann, I.',    players:2,cart:W,status:'booked',  phone:'(555)503-0009',conf:'R-8009',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'u10',date:'2026-04-12',course:'ponds', slot:0,timeMin:840,name:'Fann, J.',    players:3,cart:C,status:'walkin',  phone:'(555)503-0010',conf:'R-8010',pay:PAID,price:59, holes:'9H', playerStates:ps(3,true,-1)},
    {id:'u11',date:'2026-04-12',course:'valley',slot:0,timeMin:360,name:'Gann, K.',    players:4,cart:C,status:'group',   phone:'(555)503-0011',conf:'G-8011',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u12',date:'2026-04-12',course:'valley',slot:0,timeMin:376,name:'Hann, L.',    players:2,cart:W,status:'booked',  phone:'(555)503-0012',conf:'R-8012',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'u13',date:'2026-04-12',course:'valley',slot:0,timeMin:392,name:'Jann, M.',    players:4,cart:C,status:'group',   phone:'(555)503-0013',conf:'G-8013',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u14',date:'2026-04-12',course:'valley',slot:0,timeMin:416,name:'Kann, N.',    players:3,cart:C,status:'booked',  phone:'(555)503-0014',conf:'R-8014',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
    {id:'u15',date:'2026-04-12',course:'valley',slot:0,timeMin:440,name:'Lann, O.',    players:4,cart:C,status:'group',   phone:'(555)503-0015',conf:'G-8015',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u16',date:'2026-04-12',course:'valley',slot:0,timeMin:600,name:'Mann, P.',    players:2,cart:W,status:'booked',  phone:'(555)503-0016',conf:'R-8016',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'u17',date:'2026-04-12',course:'valley',slot:0,timeMin:840,name:'Nann, Q.',    players:3,cart:C,status:'walkin',  phone:'(555)503-0017',conf:'R-8017',pay:PAID,price:59, holes:'9H', playerStates:ps(3,true,-1)},
    {id:'u18',date:'2026-04-12',course:'rolling',slot:0,timeMin:360,name:'Oann, R.',   players:4,cart:C,status:'group',   phone:'(555)503-0018',conf:'G-8018',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u19',date:'2026-04-12',course:'rolling',slot:0,timeMin:376,name:'Pann, S.',   players:2,cart:W,status:'booked',  phone:'(555)503-0019',conf:'R-8019',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'u20',date:'2026-04-12',course:'rolling',slot:0,timeMin:392,name:'Rann, T.',   players:4,cart:C,status:'group',   phone:'(555)503-0020',conf:'G-8020',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u21',date:'2026-04-12',course:'rolling',slot:0,timeMin:416,name:'Sann, U.',   players:3,cart:C,status:'booked',  phone:'(555)503-0021',conf:'R-8021',pay:OPEN,price:100,holes:'18H',playerStates:ps(3,false,-1)},
    {id:'u22',date:'2026-04-12',course:'rolling',slot:0,timeMin:440,name:'Tann, V.',   players:4,cart:C,status:'group',   phone:'(555)503-0022',conf:'G-8022',pay:PAID,price:120,holes:'18H',playerStates:ps(4,true,-1)},
    {id:'u23',date:'2026-04-12',course:'rolling',slot:0,timeMin:600,name:'Vann, W.',   players:2,cart:W,status:'booked',  phone:'(555)503-0023',conf:'R-8023',pay:PAID,price:100,holes:'18H',playerStates:ps(2,true,-1)},
    {id:'u24',date:'2026-04-12',course:'rolling',slot:0,timeMin:840,name:'Wann, X.',   players:3,cart:C,status:'walkin',  phone:'(555)503-0024',conf:'R-8024',pay:PAID,price:59, holes:'9H', playerStates:ps(3,true,-1)},
  ];
  return [...thu_bookings, ...fri, ...sat, ...sun];
}

function applyDateWindow(srcBookings: Booking[]): Booking[] {
  // Anchor today to May 21, 2026 (Thursday). Fixed anchor (not new Date())
  // keeps demo data stable regardless of when the file is opened.
  const TODAY = new Date(2026, 4, 21); // May = month 4 (0-indexed)
  const NOON_MIN = 12 * 60; // 720

  function fmt(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function addDays(base: Date, n: number) {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  }
  // Deterministic pseudo-random for repeatable outcomes
  function hash(str: string) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }

  // Offsets relative to TODAY: -6..+4 → May 15..May 25
  const OFFSETS = [-6,-5,-4,-3,-2,-1,0,1,2,3,4];

  // Use the dense Apr 9 set as the template for every day
  const template = srcBookings.filter(b => b.date === '2026-04-09');

  // Each day keeps a slightly different subset of the template so days
  // aren't identical. Today (offset 0) keeps everything. Other days
  // probabilistically drop some bookings — weekends keep more.
  function keepFraction(offset: number) {
    const target = addDays(TODAY, offset);
    const dow = target.getDay(); // 0=Sun, 6=Sat
    const isWeekend = (dow === 0 || dow === 6);
    if (offset === 0)  return 1.00;        // today: full slate
    if (isWeekend)     return 0.92;        // weekends very busy
    if (offset === -1) return 0.85;        // yesterday: also dense
    if (offset === 1)  return 0.82;        // tomorrow: high anticipation
    if (Math.abs(offset) <= 2) return 0.72; // near days
    return 0.62;                            // farther days
  }

  function dayBucket(offset: number): DayBucket {
    if (offset < 0) return 'past';
    if (offset > 0) return 'future';
    return 'today';
  }

  const out: Booking[] = [];

  OFFSETS.forEach(offset => {
    const targetDate = addDays(TODAY, offset);
    const dateStr = fmt(targetDate);
    const bucket = dayBucket(offset);
    const keep = keepFraction(offset);

    template.forEach((src) => {
      // Deterministic per-day-per-booking thinning
      const dropRoll = hash(src.id + '::keep::' + dateStr);
      if (dropRoll > keep) return;

      // Clone with a unique id so the same template entry across multiple
      // days doesn't collide (booking ids must be unique app-wide).
      const newId = (offset === 0) ? src.id : `${src.id}_${offset>=0?'p'+offset:'m'+(-offset)}`;
      const b = {
        ...src,
        id: newId,
        date: dateStr,
        playerStates: src.playerStates.map(p => ({...p})),
      };

      applyState(b, bucket);
      out.push(b);
    });
  });

  function applyState(b: Booking, bucket: DayBucket) {
    const r = hash(b.id + '::' + bucket);

    if (bucket === 'past') {
      // Past days: realistic mix of completed-day outcomes.
      //   ~62% completed (round done, paid)
      //   ~12% no-show
      //   ~10% cancelled (refunded)
      //   ~ 8% rain check
      //   ~ 8% completed but tab still open
      if (r < 0.62) {
        b.pay = (b.status === 'member') ? 'open' : 'paid';
        b.playerStates.forEach(p => { p.paid = b.status !== 'member'; p.step = 6; p.noShow = false; });
      } else if (r < 0.74) {
        b.pay = 'no_show';
        b.playerStates.forEach(p => { p.paid = false; p.step = -1; p.noShow = true; });
      } else if (r < 0.84) {
        // Cancellation (refunded)
        b.pay = 'refund';
        b.playerStates.forEach(p => { p.paid = false; p.step = -1; p.noShow = true; });
      } else if (r < 0.92) {
        b.pay = 'rain_chk';
        b.playerStates.forEach(p => { p.paid = false; p.step = -1; p.noShow = false; });
      } else {
        b.pay = 'open';
        b.playerStates.forEach(p => { p.paid = false; p.step = 6; p.noShow = false; });
      }
    }
    else if (bucket === 'future') {
      // Future days: mostly booked, some prepaid, a few cancelled.
      // ~38% prepaid, ~55% open/pending, ~7% cancelled
      if (r < 0.07) {
        b.pay = 'refund';
        b.playerStates.forEach(p => { p.paid = false; p.step = -1; p.noShow = true; });
      } else {
        const prepaid = r < 0.45; // 0.07..0.45 = ~38% prepaid
        b.pay = (b.status === 'member') ? 'open' : (prepaid ? 'paid' : 'open');
        b.playerStates.forEach(p => {
          p.paid = prepaid && b.status !== 'member';
          p.step = -1;
          p.noShow = false;
        });
      }
    }
    else {
      // TODAY (May 21).
      // Morning tee times (before noon) have already happened — show real
      // activity. Afternoon/evening tee times are still pending.
      const isMorning = b.timeMin < NOON_MIN;

      if (!isMorning) {
        // Afternoon: not yet started. Most still pending; some prepaid.
        const prepaid = r < 0.28;
        b.pay = (b.status === 'member') ? 'open' : (prepaid ? 'paid' : 'open');
        b.playerStates.forEach(p => { p.paid = prepaid && b.status !== 'member'; p.step = -1; p.noShow = false; });
        return;
      }

      // Morning activity buckets, distributed by hash:
      //   ~55% completed round (paid, step=6, all checked in)
      //   ~15% on the course (mixed step 1-3)
      //   ~10% checked in / teed off (step 0-1, paid)
      //   ~ 6% cancelled (refunded)
      //   ~ 7% no-show
      //   ~ 7% completed but tab open
      if (r < 0.55) {
        // Completed — round done, paid, all checked in through finish
        b.pay = (b.status === 'member') ? 'open' : 'paid';
        b.playerStates.forEach(p => { p.paid = b.status !== 'member'; p.step = 3; p.noShow = false; });
      } else if (r < 0.70) {
        // Mid-round — at turn or teed off
        const mid = r < 0.625 ? 2 : 1; // step 2 = At Turn, 1 = Teed Off
        b.pay = (b.status === 'member') ? 'open' : 'paid';
        b.playerStates.forEach(p => { p.paid = b.status !== 'member'; p.step = mid; p.noShow = false; });
      } else if (r < 0.80) {
        // Just checked in
        b.pay = (b.status === 'member') ? 'open' : 'paid';
        b.playerStates.forEach(p => { p.paid = b.status !== 'member'; p.step = 0; p.noShow = false; });
      } else if (r < 0.86) {
        // Cancelled (refunded) earlier this morning
        b.pay = 'refund';
        b.playerStates.forEach(p => { p.paid = false; p.step = -1; p.noShow = true; });
      } else if (r < 0.93) {
        // No-show — tee time passed, players didn't arrive
        b.pay = 'no_show';
        b.playerStates.forEach(p => { p.paid = false; p.step = -1; p.noShow = true; });
      } else {
        // Played, tab still open at the counter
        b.pay = 'open';
        b.playerStates.forEach(p => { p.paid = false; p.step = 3; p.noShow = false; });
      }
    }
  }

  return out;
}

function injectMay21Specials(bookings: Booking[]): void {
  const DATE = '2026-05-21';

  // 1. Single non-bookable BLOCK SLOT (Ponds, slot 3, 7:28 AM — visible in default view)
  bookings.push({
    id: 'block-may21-01',
    date: DATE,
    course: 'ponds',
    slot: 3,
    timeMin: 448, // 7:28 AM
    name: 'Course Maintenance',
    players: 1,
    cart: 'walking',
    status: 'block',
    phone: '',
    conf: 'BLK-001',
    pay: 'block',
    price: 0,
    holes: '',
    note: 'Greens maintenance — slot unavailable',
    playerStates: []
  });

  // 2. Another block example mid-morning to demonstrate
  bookings.push({
    id: 'block-may21-02',
    date: DATE,
    course: 'valley',
    slot: 0,
    timeMin: 552, // 9:12 AM
    name: 'Rangers Hold',
    players: 1,
    cart: 'walking',
    status: 'block',
    phone: '',
    conf: 'BLK-002',
    pay: 'block',
    price: 0,
    holes: '',
    note: 'Held for course rangers',
    playerStates: []
  });

  // 3. SHIFT CHANGE — all 3 courses, all 4 slots, 11:52 AM through 12:08 PM
  // (3 consecutive 8-min rows: 11:52, 12:00, 12:08). Each block spans the full
  // 4-slot width so the entire course is closed during the shift change window.
  const SHIFT_COURSES = ['ponds', 'valley', 'rolling'];
  const SHIFT_TIMES = [712, 720, 728]; // 11:52 AM, 12:00 PM, 12:08 PM

  // First, remove any existing bookings on May 21 that fall inside the shift window
  // (so real tee times that were templated into this slot get cleared out)
  for (let i = bookings.length - 1; i >= 0; i--) {
    const b = bookings[i];
    if (b.date === DATE && SHIFT_COURSES.includes(b.course) && SHIFT_TIMES.includes(b.timeMin)) {
      bookings.splice(i, 1);
    }
  }

  let shiftIdx = 0;
  for (const t of SHIFT_TIMES) {
    for (const courseId of SHIFT_COURSES) {
      bookings.push({
        id: `block-shift-${shiftIdx++}`,
        date: DATE,
        course: courseId,
        slot: 0,
        timeMin: t,
        name: 'Shift Change',
        players: 4,           // spans all 4 slot columns
        cart: 'walking',
        status: 'block',
        phone: '',
        conf: 'BLK-SHIFT-' + t,
        pay: 'block',
        price: 0,
        holes: '',
        note: 'Staff shift change — course closed',
        playerStates: []
      });
    }
  }

  // 4. (Thursday League demo seed removed.)
}

/**
 * Build the full demo booking set.
 *
 * Call once and hold the result in state — regenerating would discard any
 * bookings the operator created during the session.
 */
export function createBookings(): Booking[] {
  const projected = applyDateWindow(seedBookings());
  injectMay21Specials(projected);
  return projected;
}

/** Bookings on one `YYYY-MM-DD` date. */
export function bookingsForDate(all: Booking[], dateStr: string): Booking[] {
  return all.filter((b) => b.date === dateStr);
}
