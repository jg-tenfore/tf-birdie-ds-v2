import type React from 'react';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, Chip, Stack, ThemeProvider, Typography } from '@mui/material';
import type { ChipProps } from '@mui/material';
import Done from '@mui/icons-material/Done';
import GolfCourse from '@mui/icons-material/GolfCourse';
import { expect, userEvent, within } from 'storybook/test';
import { memberTypes } from '../../theme/tokens';
import type { MemberTypeKey } from '../../theme/tokens';
import { mobileTheme } from '../../theme/mobile-theme';
import { ROUND_STEP } from '../../pos/data/config';
import { customers } from '../../pos/data/customers';
import { PillGroup } from '../../pos/modals/ModalFrame';
import { FilterChip as OpsFilterChip } from '../../pos/components/operations/OpsParts';
import { MembershipChips, RoundStatusChip } from '../../pos/components/SeatChips';
import { Chip as LeagueChip } from '../../pos/components/league/LeagueParts';
import { FilterChip as TeeFilterChip } from '../../pos/mobile/screens/tee/parts';
import { FilterChip as PeopleFilterChip, TierChip } from '../../pos/mobile/screens/people/parts';
import { Pill } from '../../pos/mobile/screens/restaurant/parts';

/** Playground args: `onDelete` is exposed as a boolean toggle rather than a handler. */
type ChipArgs = Omit<ChipProps, 'onDelete'> & { onDelete?: boolean };

const meta = {
  title: 'Design System/Components/Typography & Content/Chip',
  id: 'components-typography-content-chip',
  // Cast because the Playground exposes `onDelete` as a boolean toggle (ChipArgs) rather than a handler.
  component: Chip as unknown as React.ComponentType<ChipArgs>,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Chip` — a compact element for choices, filters and status labels. In Birdie the tablet draws its own chips (see **In Birdie**) and the handheld uses this one, themed to MD3. ' +
          'It supports `filled` and `outlined` variants, semantic `color`s, two `size`s, and an optional leading `icon` or `avatar`. ' +
          'Add `onDelete` to make it removable and `onClick` to make it interactive. ' +
          'Edit the props in the **Controls** panel below to preview combinations live.',
      },
    },
  },
  argTypes: {
    label: { control: 'text', description: 'Text shown inside the chip.' },
    variant: {
      control: 'inline-radio',
      options: ['filled', 'outlined'],
      description: 'Visual style.',
      table: { defaultValue: { summary: 'filled' } },
    },
    color: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'],
      description: 'Semantic color.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
      description: 'Chip density.',
      table: { defaultValue: { summary: 'medium' } },
    },
    disabled: { control: 'boolean', description: 'Disables interaction.' },
    onDelete: {
      control: 'boolean',
      description: 'When enabled, shows a delete affordance.',
    },
  },
  args: {
    label: 'Chip',
    variant: 'filled',
    color: 'default',
    size: 'medium',
    disabled: false,
    onDelete: false,
  },
} satisfies Meta<ChipArgs>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A single Chip — change any prop in the **Controls** panel. Toggle `onDelete` for a removable chip. */
export const Playground: Story = {
  render: ({ onDelete, ...args }) => (
    <Chip {...args} onDelete={onDelete ? () => {} : undefined} />
  ),
};

/** Every semantic color in filled and outlined form. */
export const Colors: Story = {
  parameters: { docs: { description: { story: 'Filled (top) and outlined (bottom) chips across semantic colors.' } } },
  render: () => (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
        <Chip label="Default" />
        <Chip label="Primary" color="primary" />
        <Chip label="Success" color="success" />
        <Chip label="Warning" color="warning" />
        <Chip label="Error" color="error" />
        <Chip label="Info" color="info" />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
        <Chip label="Default" variant="outlined" />
        <Chip label="Primary" variant="outlined" color="primary" />
        <Chip label="Success" variant="outlined" color="success" />
        <Chip label="Warning" variant="outlined" color="warning" />
        <Chip label="Error" variant="outlined" color="error" />
        <Chip label="Info" variant="outlined" color="info" />
      </Stack>
    </Stack>
  ),
};

/** The two available sizes. */
export const Sizes: Story = {
  parameters: { docs: { description: { story: '`small` and `medium` (default) chips.' } } },
  render: () => (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Chip label="Small" size="small" color="primary" />
      <Chip label="Medium" size="medium" color="primary" />
    </Stack>
  ),
};

/** Chips with a leading icon or an avatar. */
export const WithIconAndAvatar: Story = {
  parameters: { docs: { description: { story: 'A leading `icon` and an `avatar` slot.' } } },
  render: () => (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
      <Chip icon={<Done />} label="Checked in" color="success" />
      <Chip icon={<GolfCourse />} label="Front 9" variant="outlined" />
      <Chip avatar={<Avatar>FA</Avatar>} label="Foster, A." />
    </Stack>
  ),
};

/** Interactive chips that respond to click and delete. */
export const DeletableAndClickable: Story = {
  parameters: { docs: { description: { story: 'Chips wired with `onClick` and `onDelete`.' } } },
  render: () => (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
      <Chip label="Deletable" onDelete={() => {}} />
      <Chip label="Deletable outlined" variant="outlined" color="primary" onDelete={() => {}} />
      <Chip label="Clickable" onClick={() => {}} />
      <Chip label="Clickable + deletable" onClick={() => {}} onDelete={() => {}} color="primary" />
    </Stack>
  ),
};

const TAGS = ['VIP', 'Rain check', 'Accessibility', 'Birthday', 'Corporate'];
const TIERS = Object.keys(memberTypes) as MemberTypeKey[];
/** A real seed record with more than fits, so MembershipChips shows its +N. */
const crowded = customers.find((c) => c.memberships.length + c.customerTypes.length > 2) ?? customers[0];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'text.secondary', mt: 1 }}>
      {children}
    </Typography>
  );
}

function TabletChips() {
  const [intervalMin, setIntervalMin] = useState(8);
  const [tags, setTags] = useState<string[]>(['VIP']);
  const [filter, setFilter] = useState('all');
  const [step, setStep] = useState<number>(ROUND_STEP.teedOff);
  return (
    <Stack spacing={1.25} sx={{ width: 560 }}>
      <Label>PillGroup · a choice in a dialog</Label>
      <PillGroup label="Interval" value={intervalMin} onChange={setIntervalMin} options={[7, 8, 10, 12, 15].map((m) => ({ label: `${m} min`, value: m }))} />
      <PillGroup
        multi
        label="Tags"
        value={tags}
        onChange={(t) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
        options={TAGS.map((t) => ({ label: t, value: t }))}
      />
      <Label>FilterChip · operations screens, 40px</Label>
      <Stack direction="row" spacing={0.75}>
        <OpsFilterChip label="All levels" active={filter === 'all'} onClick={() => setFilter('all')} />
        <OpsFilterChip label="Low & out" count={8} active={filter === 'low'} onClick={() => setFilter('low')} />
        <OpsFilterChip label="Out" count={2} active={filter === 'out'} onClick={() => setFilter('out')} />
      </Stack>
      <Label>RoundStatusChip · a status you change</Label>
      <Stack direction="row">
        <RoundStatusChip step={step} onStep={setStep} label="Foster, A." />
      </Stack>
      <Label>Read-only · membership chips and the League&apos;s tones</Label>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <MembershipChips record={crowded} />
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <LeagueChip label="12/16 checked in" tone="ok" icon="how_to_reg" />
        <LeagueChip label="0 paid" tone="muted" icon="paid" />
        <LeagueChip label="4 to place" tone="warn" icon="person_add" />
        <LeagueChip label="Up next" tone="warn" icon="schedule" />
      </Stack>
    </Stack>
  );
}

/**
 * **In Birdie · tablet.** The chips the counter terminal actually renders. None is an MUI Chip:
 * `PillGroup` (dialogs), the operations `FilterChip`, `RoundStatusChip` (opens a menu of steps),
 * `MembershipChips` and the League's read-only chips. Click them; they hold state.
 */
export const InBirdie: Story = {
  name: 'In Birdie · tablet',
  render: () => <TabletChips />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Low & out/ }));
    await expect(c.getByRole('button', { name: /Low & out/ }).getAttribute('aria-pressed')).toBe('true');
    // The round status chip opens its own menu of the five steps.
    await userEvent.click(c.getByRole('button', { name: /^Foster, A\.: Teed Off\. Change$/ }));
    await expect(c.getAllByRole('menuitem').length).toBe(5);
    await userEvent.click(c.getByRole('menuitem', { name: /Finished/ }));
    await expect(c.getByRole('button', { name: /^Foster, A\.: Finished\. Change$/ })).toBeTruthy();
  },
};

function HandheldChips() {
  const [course, setCourse] = useState('all');
  const [people, setPeople] = useState('all');
  const [mine, setMine] = useState(false);
  return (
    <ThemeProvider theme={mobileTheme}>
      <Stack spacing={1.25} sx={{ width: 380, bgcolor: 'background.default', p: 2 }}>
        <Label>FilterChip (tee) · MD3, MUI Chip underneath</Label>
        <Stack direction="row" spacing={1}>
          {[
            ['all', 'All courses'],
            ['f9', 'Front 9'],
            ['b9', 'Back 9'],
          ].map(([id, label]) => (
            <TeeFilterChip key={id} label={label} selected={course === id} onClick={() => setCourse(id)} />
          ))}
        </Stack>
        <Label>FilterChip (people) · with tier dots</Label>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
          <PeopleFilterChip label="All" selected={people === 'all'} onClick={() => setPeople('all')} />
          {TIERS.slice(0, 3).map((t) => (
            <PeopleFilterChip key={t} label={memberTypes[t].label.replace(' Member', '')} dot={memberTypes[t].color} selected={people === t} onClick={() => setPeople(t)} />
          ))}
        </Stack>
        <Label>TierChip · read-only</Label>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {TIERS.map((t) => (
            <TierChip key={t} memberType={t} />
          ))}
          <TierChip memberType={null} />
        </Stack>
        <Label>Pill · restaurant, 40dp with a 48dp touch area</Label>
        <Stack direction="row" spacing={1}>
          <Pill label="All · 6" active={!mine} onClick={() => setMine(false)} />
          <Pill label="Mine · 2" active={mine} onClick={() => setMine(true)} />
        </Stack>
      </Stack>
    </ThemeProvider>
  );
}

/**
 * **In Birdie · handheld.** The phone's chips: the Tee Sheet's and People's `FilterChip` (MUI Chip
 * under the MD3 theme), `TierChip`, and the restaurant's `Pill`, which is the one built to a 48dp
 * touch area.
 */
export const InBirdieHandheld: Story = {
  name: 'In Birdie · handheld',
  render: () => <HandheldChips />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Mine · 2' }));
    await expect(c.getByRole('button', { name: 'Mine · 2' }).getAttribute('aria-pressed')).toBe('true');
    await expect(c.getByRole('button', { name: 'All · 6' }).getAttribute('aria-pressed')).toBe('false');
  },
};
