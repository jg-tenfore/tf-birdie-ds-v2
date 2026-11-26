import { memberTypes, type MemberTypeKey } from '../../theme/tokens';
import type { Customer } from './customers';

/**
 * Membership plans and their colours, the way TF Buck models them (Nov 26).
 *
 * ## Buck's rule
 *
 * In Buck a membership is a plan the course creates, and **its colour is picked on the plan and drawn
 * as given** (`tf-buck-ds-v1/src/components/application/nov-11-2026/bay-data.ts`: "Its colour is
 * picked on the plan and drawn as given, like the tee sheet does"). Buck's bay sheet draws a
 * booking's ribbon in the golfer's membership colour, and grey for *No membership*.
 *
 * ## Birdie's colours were tiers
 *
 * Birdie drew a member by **tier** — annual gold, seasonal blue, monthly purple, student cyan
 * (`memberTypes` in `tokens.ts`) — and mapped plans onto tiers in `customers.ts`. So the plan colours
 * here are each plan's tier colour: the tee sheet's member dot keeps the colour it had, and Customer
 * Search and the bay sheet's ribbons now draw the **same** colour for the same plan. One table, three
 * screens. Buck's own three bay plans (*Sim Hours Membership*, *Club Membership*, *Monthly Range*)
 * keep Buck's colours; the simulator plans Birdie's members hold draw in Buck's simulator colour.
 *
 * Fixed data.
 */

export interface MembershipPlan {
  name: string;
  /** The plan's colour, drawn as given — dot, chip and ribbon. */
  color: string;
  /** Buck's bay fees give the *Member Sim Hour* to golf members; simulator plans pay punches. */
  memberSimRate: boolean;
  /** A simulator plan — what a bay ribbon prefers when a member holds several. */
  simulator?: boolean;
}

const tier = (k: MemberTypeKey) => memberTypes[k].color;

/** Buck's simulator-plan colour (*Sim Hours Membership*, `#C77700`). */
export const SIM_PLAN_COLOR = '#C77700';

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  { name: 'Single Premium Membership', color: tier('annual'), memberSimRate: true },
  { name: 'Family Premium Membership', color: tier('annual'), memberSimRate: true },
  { name: 'Single Standard Membership', color: tier('seasonal'), memberSimRate: true },
  { name: 'Couple Premium Membership', color: tier('monthly'), memberSimRate: true },
  { name: 'Single Basic Membership', color: tier('monthly'), memberSimRate: true },
  { name: 'Social', color: tier('monthly'), memberSimRate: false },
  { name: 'Junior', color: tier('student'), memberSimRate: true },
  { name: '12-Month Member-only Simulator Membership', color: SIM_PLAN_COLOR, memberSimRate: true, simulator: true },
  { name: '3-Month Member-only Simulator Membership', color: SIM_PLAN_COLOR, memberSimRate: true, simulator: true },
  { name: '12-Month Public Simulator Membership', color: SIM_PLAN_COLOR, memberSimRate: false, simulator: true },
  { name: 'Family Fitness Membership (3 Persons)', color: '#64748b', memberSimRate: false },
  { name: 'Couple Fitness Membership', color: '#64748b', memberSimRate: false },
  { name: 'Individual Fitness Membership', color: '#64748b', memberSimRate: false },
  // Buck's bay-sheet plans, by Buck's names and colours.
  { name: 'Sim Hours Membership', color: SIM_PLAN_COLOR, memberSimRate: false, simulator: true },
  { name: 'Club Membership', color: '#5E35B1', memberSimRate: true },
  { name: 'Monthly Range', color: '#2E7D9A', memberSimRate: true },
];

/** Buck's *No membership*: grey, so an empty ribbon still reads as a decision. */
export const NO_MEMBERSHIP = { name: 'No membership', color: '#A4A7AE' } as const;

export const membershipPlan = (name: string): MembershipPlan | undefined => MEMBERSHIP_PLANS.find((p) => p.name === name);

/** A plan's colour, or the no-membership grey for a plan the table does not know. */
export const planColor = (name: string): string => membershipPlan(name)?.color ?? NO_MEMBERSHIP.color;

/**
 * The plan a bay booking's ribbon shows: a simulator plan if the golfer holds one (that is the
 * membership the bay cares about), else their first — the one that decides their rate on the tee
 * sheet. `null` is no membership.
 */
export function ribbonPlan(c: Pick<Customer, 'memberships'> | null | undefined): MembershipPlan | null {
  const held = (c?.memberships ?? []).map((m) => membershipPlan(m.name)).filter((p): p is MembershipPlan => Boolean(p));
  return held.find((p) => p.simulator) ?? held[0] ?? null;
}

/** The ribbon colour and label for a golfer. */
export function ribbonOf(c: Pick<Customer, 'memberships'> | null | undefined): { name: string; color: string } {
  const p = ribbonPlan(c);
  return p ? { name: p.name, color: p.color } : NO_MEMBERSHIP;
}
