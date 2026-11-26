import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Checkbox,
  TextField,
  Typography,
} from '@mui/material';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { md3 } from '../../theme/tokens';
import { formatPhone } from '../../pos/data/customers';
import { liveRoster } from '../../pos/data/roster';
import { findCustomers, plainName } from '../../pos/logic/customer-search';
import { Field, ResultList, ResultRow } from '../../pos/modals/ModalFrame';

// Generic demo data for MUI's own Autocomplete (kitchen stations, from the kit this repo was
// scaffolded from). Birdie's screens don't use Autocomplete — see the In Birdie story.
const stations = ['Grill', 'Fryer', 'Expo', 'Cold Line', 'Beverage', 'Dessert'];

// Menu items grouped by station, for the grouped-options variant.
type MenuItem = { label: string; station: string };
const menu: MenuItem[] = [
  { label: 'Clubhouse Burger', station: 'Grill' },
  { label: 'Turkey Club', station: 'Grill' },
  { label: 'Basket of Fries', station: 'Fryer' },
  { label: 'Fried Pickles', station: 'Fryer' },
  { label: 'Caesar Salad', station: 'Cold Line' },
  { label: 'Fruit Cup', station: 'Cold Line' },
  { label: 'Arnold Palmer', station: 'Beverage' },
  { label: 'Cold Brew', station: 'Beverage' },
];

const meta = {
  title: 'Design System/Components/Forms/Autocomplete',
  id: 'components-forms-autocomplete',
  component: Autocomplete,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Autocomplete` pairs a `TextField` with a filtered, type-ahead popup. **Birdie does not use it**: it searches into a ' +
          'list on the page instead (see the **In Birdie** story and the Design System page). These are MUI demos with generic data, ' +
          'themed as the product would theme them. Adjust the props in the **Controls** panel to preview each mode.',
      },
    },
  },
  argTypes: {
    disabled: { control: 'boolean', description: 'Disables the field.' },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
      description: 'Control density.',
      table: { defaultValue: { summary: 'medium' } },
    },
    disableClearable: { control: 'boolean', description: 'Hide the clear (×) button.' },
    fullWidth: { control: 'boolean', description: 'Expand to the container width.' },
  },
  args: {
    disabled: false,
    size: 'medium',
    disableClearable: false,
    fullWidth: false,
    options: stations,
    sx: { width: 320 },
    renderInput: (params) => <TextField {...params} label="Route to station" placeholder="Select a station" />,
  },
} satisfies Meta<typeof Autocomplete>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Single-select — start typing to filter the list. MUI demo; not used by Birdie. */
export const Playground: Story = {};

/** Multi-select renders each choice as a removable Chip. */
export const MultipleWithChips: Story = {
  parameters: {
    docs: { description: { story: 'Several values as removable chips. MUI demo; Birdie shows several-of as visible chips instead (see Multi-Select).' } },
  },
  render: (args) => (
    <Autocomplete
      multiple
      size={args.size}
      disabled={args.disabled}
      sx={{ width: 320 }}
      options={stations}
      defaultValue={['Grill', 'Fryer']}
      renderInput={(params) => <TextField {...params} label="Route to stations" placeholder="Add stations" />}
    />
  ),
};

/** Free-solo accepts a value that isn't in the list. */
export const FreeSolo: Story = {
  parameters: {
    docs: { description: { story: 'Free-solo allows a typed value that is not an option. MUI demo.' } },
  },
  render: (args) => (
    <Autocomplete
      freeSolo
      size={args.size}
      disabled={args.disabled}
      sx={{ width: 320 }}
      options={menu.map((m) => m.label)}
      renderInput={(params) => <TextField {...params} label="Item" placeholder="Type or pick an item" />}
    />
  ),
};

/** Grouped options under a heading. */
export const Grouped: Story = {
  parameters: {
    docs: { description: { story: 'Options grouped under headings. MUI demo.' } },
  },
  render: (args) => (
    <Autocomplete
      size={args.size}
      disabled={args.disabled}
      sx={{ width: 320 }}
      options={[...menu].sort((a, b) => a.station.localeCompare(b.station))}
      groupBy={(option: MenuItem) => option.station}
      getOptionLabel={(option: MenuItem) => option.label}
      renderInput={(params) => <TextField {...params} label="Menu item" placeholder="Search the menu" />}
    />
  ),
};

// Named component so the checkbox demo can keep its own state without breaking
// react-hooks/rules-of-hooks.
function CheckboxAutocompleteDemo() {
  const [value, setValue] = useState<string[]>(['Grill']);
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={stations}
      value={value}
      onChange={(_e, next) => setValue(next)}
      sx={{ width: 320 }}
      renderOption={(props, option, { selected }) => {
        const { key, ...rest } = props;
        return (
          <Box component="li" key={key} {...rest}>
            <Checkbox
              icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
              checkedIcon={<CheckBoxIcon fontSize="small" />}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option}
          </Box>
        );
      }}
      renderInput={(params) => <TextField {...params} label="Stations on this display" placeholder="Choose stations" />}
    />
  );
}

/** Inline checkboxes keep the popup open for fast multi-select. */
export const WithCheckboxes: Story = {
  parameters: {
    docs: { description: { story: 'Checkbox options with `disableCloseOnSelect` keep the popup open for several picks. MUI demo.' } },
  },
  render: () => <CheckboxAutocompleteDemo />,
};

/** Find someone the way Birdie's tablet dialogs do: a field, then result rows on the page. */
function BirdieSearch() {
  const [query, setQuery] = useState('bren');
  const roster = useMemo(() => liveRoster(), []);
  const results = useMemo(() => findCustomers(query, roster, 6), [query, roster]);
  const searching = query.trim().length >= 2;
  return (
    <Box sx={{ width: 420, p: 2.5, bgcolor: '#fff', borderRadius: 2 }}>
      <Field value={query} onChange={setQuery} placeholder="Find the customer — name, email, phone" />
      {searching && (
        <Box sx={{ mt: 1 }}>
          {results.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>Nobody matches “{query.trim()}”.</Typography>
          ) : (
            <ResultList maxHeight={300}>
              {results.map((c) => (
                <ResultRow
                  key={c.id}
                  primary={plainName(c)}
                  secondary={[c.email, formatPhone(c.phone)].filter(Boolean).join(' · ')}
                  badge={c.memberships[0]?.name}
                />
              ))}
            </ResultList>
          )}
        </Box>
      )}
    </Box>
  );
}

/**
 * **In Birdie:** search into a list on the page, not a popup — `Field`, `ResultList` and
 * `ResultRow` from `src/pos/modals/ModalFrame.tsx`, matching with `findCustomers()` over the real
 * roster, as the checkout tenders do (`TenderCustomerPicker`). Nothing until two characters; at
 * most six results; each row says enough to tell two Brennevins apart.
 */
export const InBirdie: Story = {
  name: 'In Birdie',
  render: () => <BirdieSearch />,
};
