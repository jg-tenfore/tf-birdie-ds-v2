import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTheme } from '@mui/material/styles';
import { idMeGroups, md3, memberTypes, mobile, noteColors, payBadges, playerAccents, shifts } from '../../theme/tokens';
import { PayBadge } from '../../pos/components/primitives';
import { CATALOG } from '../../pos/data/catalog';
import { REGISTER_CATEGORIES } from '../../pos/data/register-extras';
import { KITCHEN } from '../../pos/mobile/screens/restaurant/restaurant-helpers';
import { TABLE_STATUS_STYLE } from '../../pos/components/restaurant/floor-style';
import { Contrast } from '../ds-docs/Contrast';
import { StatusChips } from '../../stories/start-here/style-parts';
import { Card, ColorCard, Group, Row, Sheet, Table, mono } from './foundation-parts';

/**
 * Design System › Styles › Colors.
 *
 * Every colour on these sheets is read from the code that ships it — `src/theme/tokens.ts`, the
 * theme, the catalog, the handheld's kitchen colour — so the reference can't drift from the
 * screens. Contrast is computed by `<Contrast>`, never typed. The write-up is
 * `src/showcase/ds-docs/content/foundations-colors.tsx`.
 */

/** What each MD3 role does in Birdie. Keys are the token names in `md3` / `mobile`. */
const ROLE_USE: Record<string, string> = {
  primary: 'The POS green. Paid chips, selected tabs, the green Pay and Check in & pay buttons, focus.',
  primaryContainer: 'Selected and loaded: an active chip, a selected toggle, the golf summary, a loaded customer.',
  onPrimary: 'Text and icons on green.',
  onPrimaryContainer: 'Text on primary-container (a selected chip label, the shift readout).',
  secondary: 'Barely used: the league view\'s avatars (LeagueView.tsx). A candidate to drop or give a job.',
  surface: 'The app ground. Cards and panels are white on it.',
  surfaceContainer: 'Wells: cart lines, result lists, form sections, player rows.',
  surfaceHigh: 'Hover wash on icon buttons and quiet surfaces.',
  surfaceHighest: 'Disabled fills (FilledButton, Send) and the menu switcher\'s track.',
  onSurface: 'Body text, headings, and the dark FilledButton (Pay on the tab, Check in & pay all).',
  onSurfaceVariant: 'Secondary text, labels, section labels, outlined-button labels, icons.',
  outline: 'Low-emphasis text and disabled text. Borderline for small text (see the matrix).',
  outlineVariant: 'Every 1.5px hairline: cards, chips, inputs, grid cells, dividers.',
  error: 'Delete, Void, no-show, refusals, allergy flags.',
  scrim: 'The dark ground: sign-in, tooltips, toasts, the top bar\'s Register / Tee sheet switch.',
  secondaryContainer: 'Handheld only: the navigation bar\'s active pill.',
  onSecondaryContainer: 'Handheld only: the active navigation icon and label.',
  surfaceContainerLow: 'Handheld only: the ground for cards on a scrolling list.',
};

const TEXT_ON: Record<string, string> = { primary: '#ffffff', onSurface: '#ffffff', scrim: '#ffffff', error: '#ffffff', primaryContainer: md3.onPrimaryContainer, secondaryContainer: mobile.onSecondaryContainer };

function AllColorsSheet() {
  const t = useTheme();
  const core = Object.entries(md3) as [string, string][];
  const handheld: [string, string][] = [
    ['secondaryContainer', mobile.secondaryContainer],
    ['onSecondaryContainer', mobile.onSecondaryContainer],
    ['surfaceContainerLow', mobile.surfaceContainerLow],
  ];
  const muiSlots = (['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const).map((k) => [k, t.palette[k].main] as const);

  return (
    <Sheet>
      <Group
        title="MD3 roles · md3 in tokens.ts"
        intro="The role set every component reads, ported 1:1 from the HTML prototype's :root block. Pick a colour by its role, never by its hex."
      >
        <Row>
          {core.map(([k, v]) => (
            <ColorCard key={k} token={`md3.${k}`} value={v} use={ROLE_USE[k]} fg={TEXT_ON[k]} />
          ))}
        </Row>
      </Group>

      <Group title="Handheld additions · mobile in tokens.ts" intro="Three MD3 roles the counter never needed, from the same green seed. Only src/pos/mobile reads them.">
        <Row>
          {handheld.map(([k, v]) => (
            <ColorCard key={k} token={`mobile.${k}`} value={v} use={ROLE_USE[k]} fg={TEXT_ON[k]} />
          ))}
        </Row>
      </Group>

      <Group title="MUI palette slots · theme.ts" intro="How the roles land on MUI's palette, so a stock MUI component is themed without a per-component colour. warning, info and success are Tailwind-like literals set in theme.ts, not MD3 roles.">
        <Row>
          {muiSlots.map(([k, v]) => (
            <ColorCard key={k} token={`palette.${k}.main`} value={v} />
          ))}
        </Row>
      </Group>

      <Group title="Payment state · payBadges" intro="The most-scanned signal in the product. The badge beside a name (PayBadge), and the chip on the tee sheet, which draws the same states as fills.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {(Object.keys(payBadges) as (keyof typeof payBadges)[]).map((k) => (
            <Card key={k} style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 128 }}>
              <PayBadge pay={k} />
              <span style={{ fontFamily: mono, fontSize: 11 }}>
                {payBadges[k].text} on {payBadges[k].bg}
              </span>
              <Contrast fg={payBadges[k].text} bg={payBadges[k].bg} label={payBadges[k].label.slice(0, 4)} />
            </Card>
          ))}
        </div>
        <StatusChips />
      </Group>

      <Group title="Table status · TABLE_STATUS_STYLE" intro="The restaurant floor speaks the tee sheet's language: a free table is white with a green outline, a seated one is solid green, a table waiting on its check is orange. Shared by the tablet's floor, the Table Chart editor and the handheld's Tables (floor-style.ts).">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {(Object.keys(TABLE_STATUS_STYLE) as (keyof typeof TABLE_STATUS_STYLE)[]).map((k) => {
            const s = TABLE_STATUS_STYLE[k];
            return (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ width: 96, height: 56, borderRadius: 10, background: s.bg, border: `2px solid ${s.border}`, color: s.text, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.label}</span>
                <Contrast fg={s.text} bg={s.bg} label="T5" />
              </div>
            );
          })}
        </div>
      </Group>

      <Group title="Time of day · shifts" intro="The tee sheet's bands. bg tints list-view cards; bandBg tints the grid's rows; the icon colour marks the band in the Day selector.">
        <Row min={220}>
          {(Object.keys(shifts) as (keyof typeof shifts)[])
            .filter((k) => shifts[k].bg)
            .map((k) => (
              <Card key={k}>
                <div style={{ display: 'flex' }}>
                  <div style={{ flex: 1, height: 48, background: shifts[k].bg ?? undefined }} />
                  <div style={{ flex: 1, height: 48, background: shifts[k].bandBg ?? undefined }} />
                  <div style={{ width: 48, height: 48, background: shifts[k].iconColor }} />
                </div>
                <div style={{ padding: '8px 10px', fontSize: 12.5 }}>
                  <strong>{shifts[k].label}</strong>
                  <div style={{ fontFamily: mono, fontSize: 11, color: md3.onSurfaceVariant }}>
                    {shifts[k].bg} · {shifts[k].bandBg} · {shifts[k].iconColor}
                  </div>
                </div>
              </Card>
            ))}
        </Row>
      </Group>

      <Group title="Membership · memberTypes" intro="The dot on a tee-sheet chip and a list row, and the badge on the customer record. The dot is backed by a tooltip with the tier's name.">
        <Row min={190}>
          {(Object.keys(memberTypes) as (keyof typeof memberTypes)[]).map((k) => (
            <Card key={k} style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: memberTypes[k].color }} />
                {memberTypes[k].label}
              </span>
              <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: memberTypes[k].bg, color: md3.onSurface }}>{k}</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: md3.onSurfaceVariant }}>
                dot {memberTypes[k].color} · bg {memberTypes[k].bg}
              </span>
              <Contrast fg={memberTypes[k].color} bg="#ffffff" size="non-text" label="●" />
            </Card>
          ))}
        </Row>
      </Group>

      <Group title="Operator notes · noteColors" intro="A note pinned to a tee-sheet time row (a frost delay, a lightning hold, a shotgun start). The operator picks the colour.">
        <Row min={200}>
          {(Object.keys(noteColors) as (keyof typeof noteColors)[]).map((k) => (
            <div key={k} style={{ borderRadius: 8, border: `1px solid ${noteColors[k].border}`, background: noteColors[k].bg, color: noteColors[k].text, padding: '8px 10px', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: noteColors[k].dot, flexShrink: 0 }} />
              {k}: frost delay until 7:30 AM
            </div>
          ))}
        </Row>
      </Group>

      <Group title="People in a party · playerAccents" intro="By position, not identity: player 1 is green, then blue, amber, violet, red. The reservation's player stripes and avatars, the tab's seats on both surfaces.">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {playerAccents.map((c, i) => (
            <Card key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 0', borderLeft: `4px solid ${c}` }}>
              <span style={{ marginLeft: 10, width: 28, height: 28, borderRadius: '50%', background: c, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>P{i + 1}</span>
              <span style={{ fontSize: 12.5 }}>
                Seat {i + 1} <span style={{ fontFamily: mono, fontSize: 11, color: md3.onSurfaceVariant }}>{c}</span>
              </span>
            </Card>
          ))}
        </div>
      </Group>

      <Group title="The kitchen · KITCHEN (handheld) and literals (tablet)" intro="Amber means it hasn't gone to the kitchen yet: unsent dish lines, the Send button, the 'n to send' status on a tab. Defined once for the handheld in restaurant-helpers.ts; typed as the same literals on the tablet.">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 22px', borderRadius: 999, background: KITCHEN.solid, color: '#fff', fontWeight: 600, fontSize: 15 }}>Send 2</span>
          <div style={{ background: KITCHEN.tint, borderTop: `1px solid ${KITCHEN.edge}`, borderBottom: `1px solid ${KITCHEN.edge}`, padding: '8px 14px', minWidth: 240 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Butter Cake</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: KITCHEN.text }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: KITCHEN.dot }} />
              Not sent
            </div>
          </div>
          <Contrast fg="#ffffff" bg={KITCHEN.solid} label="Send" />
          <Contrast fg={KITCHEN.text} bg={KITCHEN.tint} label="Not" />
        </div>
      </Group>

      <Group title="Identity · idMeGroups" intro="ID.me verification badges. One neutral blue for every group, so a verified status reads as identity, not as payment or membership.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {(Object.keys(idMeGroups) as (keyof typeof idMeGroups)[]).map((k) => (
            <span key={k} style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: idMeGroups[k].bg, color: idMeGroups[k].text }}>
              {idMeGroups[k].label}
            </span>
          ))}
          <Contrast fg={idMeGroups.military.text} bg={idMeGroups.military.bg} label="ID" />
        </div>
      </Group>
    </Sheet>
  );
}

/** Text roles, and the surfaces they sit on. */
const TEXT_ROLES: [string, string][] = [
  ['md3.onSurface', md3.onSurface],
  ['md3.onSurfaceVariant', md3.onSurfaceVariant],
  ['md3.outline', md3.outline],
  ['md3.primary', md3.primary],
  ['palette.primary.dark', '#0f7a36'],
  ['md3.error', md3.error],
  ['md3.secondary', md3.secondary],
];
const SURFACES: [string, string][] = [
  ['white (paper)', '#ffffff'],
  ['surface', md3.surface],
  ['surfaceContainer', md3.surfaceContainer],
  ['surfaceHigh', md3.surfaceHigh],
  ['primaryContainer', md3.primaryContainer],
  ['secondaryContainer (handheld)', mobile.secondaryContainer],
];

function ContrastMatrixSheet() {
  return (
    <Sheet>
      <Group
        title="Text roles on every surface"
        intro="Each cell is computed from the two colours. Body text in Birdie is 11 to 14px, so the bar is AA for small text: 4.5:1. A Fail here is a pair to keep out of text, or an open decision where the product already uses it."
      >
        <Table
          head={['Text role', ...SURFACES.map(([n]) => n)]}
          rows={TEXT_ROLES.map(([n, fg]) => [
            <span key="n" style={{ fontFamily: mono, fontSize: 12 }}>{n}</span>,
            ...SURFACES.map(([, bg]) => <Contrast key={bg} fg={fg} bg={bg} />),
          ])}
        />
      </Group>
      <Group title="Text on a fill" intro="The pairs the product draws on solid colour: button labels, chip names, the dark ground.">
        <Table
          head={['Pair', 'Where', 'Small text', 'Large text (18.7px bold)']}
          rows={[
            ['White on md3.primary', 'Green buttons (Pay, Check in & pay), paid chips on the tee sheet', <Contrast key="a" fg="#ffffff" bg={md3.primary} />, <Contrast key="b" fg="#ffffff" bg={md3.primary} size="large" />],
            ['White on md3.onSurface', 'FilledButton, the tab\'s Pay, Check in & pay all', <Contrast key="a" fg="#ffffff" bg={md3.onSurface} />, <Contrast key="b" fg="#ffffff" bg={md3.onSurface} size="large" />],
            ['White on md3.scrim', 'Sign-in, tooltips, toasts', <Contrast key="a" fg="#ffffff" bg={md3.scrim} />, <Contrast key="b" fg="#ffffff" bg={md3.scrim} size="large" />],
            ['White on md3.error', 'Destructive fills, the allergy chip', <Contrast key="a" fg="#ffffff" bg={md3.error} />, <Contrast key="b" fg="#ffffff" bg={md3.error} size="large" />],
            ['md3.primary on primaryContainer', 'A selected ToggleButton\'s label (theme.ts)', <Contrast key="a" fg={md3.primary} bg={md3.primaryContainer} />, <Contrast key="b" fg={md3.primary} bg={md3.primaryContainer} size="large" />],
            ['onPrimaryContainer on primaryContainer', 'A selected chip, the shift readout', <Contrast key="a" fg={md3.onPrimaryContainer} bg={md3.primaryContainer} />, <Contrast key="b" fg={md3.onPrimaryContainer} bg={md3.primaryContainer} size="large" />],
            ['White on the refunded chip (#ea580c)', 'Tee sheet, refunded bookings (9px bold names)', <Contrast key="a" fg="#ffffff" bg="#ea580c" />, <Contrast key="b" fg="#ffffff" bg="#ea580c" size="large" />],
            ['#888 on the no-show hatch (#e8ece8)', 'Tee sheet, no-show and rain-check names', <Contrast key="a" fg="#888888" bg="#e8ece8" />, <Contrast key="b" fg="#888888" bg="#e8ece8" size="large" />],
          ]}
        />
      </Group>
      <Group title="Non-text" intro="Outlines, dots and icons need 3:1 against what they sit on. The hairline is decorative (a card has its fill and content too); an input's outline is not.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          <span style={{ fontSize: 12.5 }}>outlineVariant on white <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" label="─" /></span>
          <span style={{ fontSize: 12.5 }}>outline on white <Contrast fg={md3.outline} bg="#ffffff" size="non-text" label="─" /></span>
          <span style={{ fontSize: 12.5 }}>primary on white <Contrast fg={md3.primary} bg="#ffffff" size="non-text" label="●" /></span>
        </div>
      </Group>
    </Sheet>
  );
}

function CategoryTilesSheet() {
  const tiles = [
    ...Object.entries(CATALOG).map(([label, c]) => ({ label, color: c.color, tc: c.tc, source: 'catalog.ts' })),
    ...REGISTER_CATEGORIES.map((c) => ({ label: c.label.toUpperCase(), color: c.color, tc: c.tc, source: 'register-extras.ts' })),
  ];
  return (
    <Sheet>
      <Group
        title="Register category tiles"
        intro="Each category carries its own fill, so staff find it by colour and position. The fills are catalog data, not tokens. The label is 11px bold capitals, so it needs 4.5:1."
      >
        <Row min={200}>
          {tiles.map((t) => (
            <Card key={t.label} style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 54, borderRadius: 12, background: t.color, color: t.tc, fontSize: 11, fontWeight: 700, letterSpacing: '.6px', padding: '9px 10px', display: 'flex', alignItems: 'flex-end' }}>{t.label}</div>
              <span style={{ fontFamily: mono, fontSize: 11, color: md3.onSurfaceVariant }}>
                {t.tc} on {t.color} · {t.source}
              </span>
              <Contrast fg={t.tc} bg={t.color} />
            </Card>
          ))}
        </Row>
      </Group>
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Colors',
  id: 'foundations-colors',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

export const AllColors: StoryObj = {
  render: () => <AllColorsSheet />,
  parameters: { docs: { description: { story: 'Every role and semantic set, read from tokens.ts and the code that ships it.' } } },
};

export const ContrastMatrix: StoryObj = {
  name: 'Contrast matrix',
  render: () => <ContrastMatrixSheet />,
  parameters: {
    docs: { description: { story: 'Computed WCAG ratios for every text role on every surface, the fills the product puts text on, and the non-text outlines.' } },
  },
};

export const CategoryTiles: StoryObj = {
  name: 'Category tiles',
  render: () => <CategoryTilesSheet />,
  parameters: {
    docs: { description: { story: "The register's category fills with their label colour, from the catalog. Several original fills fail with white labels; Combos and Gift card, added in V1 → V2, chose darker fills that pass." } },
  },
};
