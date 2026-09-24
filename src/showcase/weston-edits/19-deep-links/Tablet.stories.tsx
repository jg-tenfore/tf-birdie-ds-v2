import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { expect, within } from 'storybook/test';
import { md3, radius } from '../../../theme/tokens';
import { Stack } from '../../../pos/components/Stack';
import { venueBookings } from '../../../pos/data/venues';
import { seatRecord } from '../../../pos/logic/seat-pricing';

/**
 * Weston Edits / 19 · Deep Links / Tablet
 *
 * **Every screen in the Weston tablet prototype, as a URL.**
 *
 * This page is a QA tool rather than a design one. The reservation panel has been linkable
 * since round 3, but everything reached *from* it — the customer record, the ID document, a
 * seat's rate editor, the rate catalog — lived in component state, so the most you could hand
 * a reviewer was a link to the reservation and a sentence describing the three taps that
 * follow. For review that is backwards: the link should land on the thing being looked at.
 *
 * So those four moved onto the store and each got a parameter. The links below are built from
 * the real venue data at render time, so a booking id that stops existing breaks this page
 * rather than quietly producing a dead link.
 *
 * ## The vocabulary
 *
 * Everything hangs off `#/tee-sheet`, and the encoder only emits what differs from the
 * default — so an ordinary link stays short and a comparison link says exactly what it is
 * comparing.
 *
 * | Param | Value | What it opens |
 * |---|---|---|
 * | `venue` | `eighteen` · `nine` · `three-nines` | Which club |
 * | `res` | booking id | The reservation panel |
 * | `res-tab` | `players` · `financial` · `notes` · `activity` | Which tab. Omitted for `players` |
 * | `rate` | seat index, **0-based** | That seat's rate editor, expanded in place |
 * | `rate-all` | `1` | The "+N more…" catalog over the editor. Needs `rate` |
 * | `cust` | customer id, or `assign` | The customer record. `assign` is the search screen with nobody resolved |
 * | `cust-seat` | seat index | Which position it was opened from — what a link or create will fill |
 * | `cust-assign` | `1` | Force the search screen even though the id resolves |
 * | `id-doc` | `1` | The ID.me document. Needs a `cust` that resolves |
 * | `pw` | `standard` · `wide` · `cover` | Width for **this** panel only |
 * | `backdrop` | `scrim` · `squeeze` | What the sheet does behind it |
 * | `width` | `standard` · `wide` · `cover` | The edition default — every panel |
 * | `density` | `comfortable` · `dense` | Player row density |
 * | `transport` | `toggle` · `named` | Transport as icons, or as the rate it bills |
 * | `catalog` | `standard` · `heavy` | Swap in the 26-rate course |
 * | `date` · `shift` | `2026-05-23` · `peak` | Day and band |
 * | `panel` | `open` · `collapsed` | The order rail |
 *
 * ## Two ways a stale link is allowed to fail
 *
 * Both deliberately visible rather than approximate, because landing on a plausible
 * neighbouring screen looks like the link worked:
 *
 * - a **`cust=` matching nobody** drops the record rather than degrading to "Add golfer";
 * - a **`rate=` past the party size** is dropped rather than clamped to the last seat.
 *
 * A `res=` naming a booking the club does not have already behaved this way — it drops the
 * panel instead of rendering an empty frame.
 *
 * ## Using this page
 *
 * The origin box at the top is editable and remembered per render. It starts on
 * `localhost:5173`, which is `npm run dev`; point it at the deployed prototype
 * (`…/tf-birdie-ds-v2/weston-edits/`) to send someone a link they can open.
 *
 * Note the two different things a width parameter can mean: **`pw`** dresses one panel, which
 * is what a "does 640 still work" comparison wants; **`width`** changes the edition default,
 * which is what QA-ing the shipped setting wants.
 */
const meta = {
  title: 'Weston Edits/19 · Deep Links/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A real booking with a resolvable booker — most bookings do not have one. */
const sample = () => {
  const bookings = venueBookings('eighteen');
  const party = bookings.find((b) => b.players >= 3 && seatRecord(b, 0))!;
  return { party, record: seatRecord(party, 0)! };
};

interface Link {
  what: string;
  hash: string;
  note?: string;
}

function linkGroups(): { group: string; links: Link[] }[] {
  const { party, record } = sample();
  const b = party.id;
  const v = 'venue=eighteen';
  return [
    {
      group: 'The reservation',
      links: [
        { what: 'Panel open on a party', hash: `#/tee-sheet?${v}&res=${b}`, note: `${party.name}, ${party.players} players` },
        { what: 'Financial tab', hash: `#/tee-sheet?${v}&res=${b}&res-tab=financial` },
        { what: 'Notes tab', hash: `#/tee-sheet?${v}&res=${b}&res-tab=notes` },
        { what: 'Activity tab', hash: `#/tee-sheet?${v}&res=${b}&res-tab=activity` },
        { what: 'Order rail expanded beside it', hash: `#/tee-sheet?${v}&res=${b}&panel=open` },
      ],
    },
    {
      group: 'The rate editor',
      links: [
        { what: 'Open on seat 1', hash: `#/tee-sheet?${v}&res=${b}&rate=0` },
        { what: 'Open on seat 2', hash: `#/tee-sheet?${v}&res=${b}&rate=1` },
        { what: 'The full catalog, 26-rate course', hash: `#/tee-sheet?${v}&res=${b}&rate=0&rate-all=1&catalog=heavy`, note: 'the “+N more…” dialog' },
        { what: 'A 26-rate course, truncated on the row', hash: `#/tee-sheet?${v}&res=${b}&rate=0&catalog=heavy` },
        { what: 'Transport named rather than iconed', hash: `#/tee-sheet?${v}&res=${b}&rate=0&transport=named` },
      ],
    },
    {
      group: 'The customer record',
      links: [
        { what: 'The booker’s record', hash: `#/tee-sheet?${v}&res=${b}&cust=${record.id}&cust-seat=0`, note: record.displayName },
        { what: 'The ID.me document', hash: `#/tee-sheet?${v}&res=${b}&cust=${record.id}&cust-seat=0&id-doc=1` },
        { what: 'Add golfer — the search screen', hash: `#/tee-sheet?${v}&res=${b}&cust=assign&cust-seat=2` },
        { what: 'Change golfer on a linked seat', hash: `#/tee-sheet?${v}&res=${b}&cust=${record.id}&cust-seat=0&cust-assign=1` },
      ],
    },
    {
      group: 'Geometry — this panel only',
      links: [
        { what: '640', hash: `#/tee-sheet?${v}&res=${b}&pw=standard` },
        { what: '820 — what ships', hash: `#/tee-sheet?${v}&res=${b}&pw=wide` },
        { what: 'Cover', hash: `#/tee-sheet?${v}&res=${b}&pw=cover` },
        { what: 'The old squeeze, for comparison', hash: `#/tee-sheet?${v}&res=${b}&pw=wide&backdrop=squeeze` },
      ],
    },
    {
      group: 'Variants — every panel',
      links: [
        { what: 'Edition default at 640', hash: `#/tee-sheet?${v}&res=${b}&width=standard` },
        { what: 'Dense player rows', hash: `#/tee-sheet?${v}&res=${b}&density=dense` },
        { what: 'Everything at once', hash: `#/tee-sheet?${v}&res=${b}&width=standard&density=dense&transport=named&catalog=heavy` },
      ],
    },
    {
      group: 'Stale links fail visibly',
      links: [
        { what: 'A customer who does not exist', hash: `#/tee-sheet?${v}&res=${b}&cust=nosuchperson`, note: 'the record is dropped, not degraded to “Add golfer”' },
        { what: 'A seat the party does not have', hash: `#/tee-sheet?${v}&res=${b}&rate=7`, note: 'dropped, not clamped to the last seat' },
        { what: 'A booking this club does not have', hash: `#/tee-sheet?${v}&res=nosuchbooking`, note: 'the panel is dropped, not an empty frame' },
      ],
    },
  ];
}

/**
 * Every deep link the Weston tablet understands, built from live venue data and clickable.
 *
 * Point the origin box at whichever copy you are reviewing. The links open in a new tab, so
 * this page stays where it is while you work through them.
 */
export const EveryLink: Story = {
  render: function Render() {
    // `npm run dev`, which is where these get used most. Editable because the deployed copy
    // lives at a different origin *and* a different path.
    const [origin, setOrigin] = useState('http://localhost:5173/?edition=weston');
    const groups = linkGroups();

    return (
      <Box sx={{ p: 4, bgcolor: md3.surface, minHeight: '100vh', fontFamily: 'system-ui' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: md3.onSurface }}>
          Weston tablet · deep links
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: md3.onSurfaceVariant, mt: 0.5, maxWidth: 720 }}>
          Built from the 18-hole club’s real bookings at render time, so a link here cannot go
          stale without this page breaking too.
        </Typography>

        <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 2.5, maxWidth: 720 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: md3.onSurfaceVariant, flexShrink: 0 }}>
            Origin
          </Typography>
          <InputBase
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            aria-label="Prototype origin"
            sx={{
              flex: 1,
              fontSize: 13,
              fontFamily: 'ui-monospace, monospace',
              px: 1.25,
              py: 0.75,
              bgcolor: md3.onPrimary,
              border: `1.5px solid ${md3.outlineVariant}`,
              borderRadius: `${radius.sm}px`,
            }}
          />
        </Stack>

        {groups.map(({ group, links }) => (
          <Box key={group} sx={{ mt: 3 }}>
            <Typography
              sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, color: md3.onSurfaceVariant, mb: 1 }}
            >
              {group.toUpperCase()}
            </Typography>
            {links.map((l) => (
              <Box
                key={l.hash}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 260px) 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: `1px solid ${md3.outlineVariant}`,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: md3.onSurface }}>{l.what}</Typography>
                  {l.note && (
                    <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{l.note}</Typography>
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontFamily: 'ui-monospace, monospace',
                    color: md3.onSurfaceVariant,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {l.hash}
                </Typography>
                <Stack direction="row" gap={0.75}>
                  <ButtonBase
                    component="a"
                    href={origin + l.hash}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      height: 34,
                      px: 1.5,
                      borderRadius: `${radius.xl}px`,
                      bgcolor: md3.primary,
                      color: md3.onPrimary,
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    Open
                  </ButtonBase>
                  <ButtonBase
                    onClick={() => void navigator.clipboard?.writeText(origin + l.hash)}
                    aria-label={`Copy link for ${l.what}`}
                    sx={{
                      height: 34,
                      px: 1.5,
                      borderRadius: `${radius.xl}px`,
                      border: `1.5px solid ${md3.outlineVariant}`,
                      fontSize: 12,
                      fontWeight: 700,
                      color: md3.onSurface,
                      flexShrink: 0,
                    }}
                  >
                    Copy
                  </ButtonBase>
                </Stack>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The links are built from live data, so this also asserts the sample booking still
    // resolves a booker — the thing most likely to drift as the fixtures change.
    const { party, record } = sample();
    await expect(canvas.getAllByText(new RegExp(`res=${party.id}`)).length).toBeGreaterThan(4);
    await expect(canvas.getAllByText(new RegExp(`cust=${record.id}`)).length).toBeGreaterThan(0);
    // Every row offers both an Open and a Copy.
    const opens = canvas.getAllByRole('link', { name: 'Open' });
    const copies = canvas.getAllByRole('button', { name: /^Copy link for/ });
    await expect(opens.length).toBe(copies.length);
    await expect(opens.length).toBeGreaterThan(20);
  },
};
