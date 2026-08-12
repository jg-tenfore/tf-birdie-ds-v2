import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { md3, memberTypes, noteColors, payBadges, playerAccents, shifts } from '../../theme/tokens';

/**
 * Foundations / Colors
 *
 * The full Birdie POS palette, grouped the way the design system is actually
 * organized: MD3 core roles first (these are what components consume), then the
 * semantic sets that encode domain state — payment status, time-of-day band,
 * membership tier.
 */

function Swatch({ name, color, note }: { name: string; color: string; note?: string }) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', width: 158 }}>
      <Box sx={{ height: 56, bgcolor: color, borderBottom: 1, borderColor: 'divider' }} />
      <Box sx={{ p: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
          {color}
        </Typography>
        {note && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
            {note}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

function Group({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<[string, string, string?]>;
}) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 640 }}>
        {description}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {items.map(([n, c, note]) => (
          <Swatch key={n} name={n} color={c} note={note} />
        ))}
      </Box>
    </Box>
  );
}

function Colors() {
  const t = useTheme();

  const core: Array<[string, string, string?]> = [
    ['primary', md3.primary, 'Brand green'],
    ['primary-container', md3.primaryContainer, 'Active / selected fill'],
    ['on-primary-container', md3.onPrimaryContainer],
    ['secondary', md3.secondary],
    ['surface', md3.surface, 'App frame'],
    ['surface-container', md3.surfaceContainer, 'Cart rows, wells'],
    ['surface-high', md3.surfaceHigh, 'Icon-button hover'],
    ['surface-highest', md3.surfaceHighest, 'Disabled fill'],
    ['on-surface', md3.onSurface, 'Body text, Pay button'],
    ['on-surface-variant', md3.onSurfaceVariant, 'Secondary text'],
    ['outline', md3.outline, 'Low-emphasis text'],
    ['outline-variant', md3.outlineVariant, 'Every hairline border'],
    ['error', md3.error],
    ['scrim', md3.scrim, 'Behind the device shell'],
  ];

  const muiRoles = (['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const).map(
    (k) => [`palette.${k}.main`, t.palette[k].main] as [string, string],
  );

  const pay = Object.entries(payBadges).flatMap(
    ([k, v]) =>
      [
        [`pay.${k} · bg`, v.bg, v.label],
        [`pay.${k} · text`, v.text],
      ] as Array<[string, string, string?]>,
  );

  const bands = Object.entries(shifts)
    .filter(([, v]) => v.bg)
    .map(([k, v]) => [`shift.${k}`, v.bg as string, v.label] as [string, string, string]);

  const tiers = Object.entries(memberTypes).flatMap(
    ([k, v]) =>
      [
        [`member.${k} · dot`, v.color, v.label],
        [`member.${k} · bg`, v.bg],
      ] as Array<[string, string, string?]>,
  );

  const notes = Object.entries(noteColors).map(
    ([k, v]) => [`note.${k}`, v.dot] as [string, string],
  );

  const players = playerAccents.map(
    (c, i) => [`player ${i + 1}`, c] as [string, string],
  );

  return (
    <Stack spacing={5} sx={{ p: 3 }}>
      <Box>
        <Typography variant="h2" gutterBottom>
          Colors
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
          Ported from the Golf Course POS prototype, which follows Material Design 3 role
          naming. Light mode only — the POS runs on a lit pro-shop counter terminal, so the
          prototype has no dark tone set. Because the roles are semantic rather than literal,
          adding a dark scheme later means adding tones, not touching components.
        </Typography>
      </Box>

      <Group
        title="MD3 core roles"
        description="The token set every component reads. `outline-variant` does the most work in this design — it is the 1.5px hairline on cards, chips, inputs, and grid cells."
        items={core}
      />
      <Group
        title="MUI palette mapping"
        description="How the MD3 roles land on MUI's own palette slots, so stock MUI components inherit the POS look without per-component overrides."
        items={muiRoles}
      />
      <Group
        title="Payment status"
        description="Badge fill and text per `booking.pay`. This is the single most-scanned signal on the tee sheet — an operator reads payment state before anything else."
        items={pay}
      />
      <Group
        title="Time-of-day bands"
        description="Row tints on the tee-sheet grid and card backgrounds in list view. They also key the rate card, since pricing changes by band."
        items={bands}
      />
      <Group
        title="Membership tiers"
        description="Dot and badge colors for the five membership types. The dot appears on tee-sheet chips so staff can spot a member without opening the booking."
        items={tiers}
      />
      <Group
        title="Operator notes"
        description="Five note colors for annotating a tee-sheet time row — frost delays, lightning holds, shotgun starts."
        items={notes}
      />
      <Group
        title="Player accents"
        description="Assigned by seat position, not identity. Used for avatar initials, the check-in progress rail, and per-player financial rows."
        items={players}
      />
    </Stack>
  );
}

const meta = {
  title: 'Foundations/Colors',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

export const AllColors: StoryObj = { render: () => <Colors /> };
