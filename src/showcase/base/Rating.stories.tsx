import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Rating, Typography } from '@mui/material';
import Whatshot from '@mui/icons-material/Whatshot';
import WhatshotBorder from '@mui/icons-material/WhatshotOutlined';

const meta = {
  title: 'Design System/Components/Forms/Rating',
  id: 'components-forms-rating',
  component: Rating,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Rating` captures a star (or custom-icon) score. **Birdie does not use it** and documents it to avoid: nothing at ' +
          'the counter or on the handheld asks for a score. These are MUI demos with generic data from the kit this repo was ' +
          'scaffolded from. Use the **Controls** panel to explore `value`, `precision`, `max`, `size`, and the read-only / disabled states.',
      },
    },
  },
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 5, step: 0.5 }, description: 'Current rating value.' },
    precision: {
      control: 'inline-radio',
      options: [0.5, 1],
      description: 'Smallest increment selectable (half or whole).',
      table: { defaultValue: { summary: '1' } },
    },
    max: { control: { type: 'number', min: 1, max: 10, step: 1 }, description: 'Number of icons shown.' },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
      description: 'Icon size.',
      table: { defaultValue: { summary: 'medium' } },
    },
    readOnly: { control: 'boolean', description: 'Display-only, non-interactive.' },
    disabled: { control: 'boolean', description: 'Disables interaction.' },
  },
  args: {
    value: 3,
    precision: 1,
    max: 5,
    size: 'medium',
    readOnly: false,
    disabled: false,
  },
} satisfies Meta<typeof Rating>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Fully interactive — click a star, or change any prop in the **Controls** panel. */
export const Playground: Story = {};

/** Half-star precision. MUI demo. */
export const HalfRatings: Story = {
  parameters: { docs: { description: { story: 'Set `precision={0.5}` to allow half-star scores such as 3.5.' } } },
  render: (args) => <Rating {...args} precision={0.5} defaultValue={3.5} />,
};

/** Read-only display beside a label and its number. MUI demo. */
export const ReadOnlyWithLabel: Story = {
  parameters: { docs: { description: { story: 'A non-interactive score with its number beside it — the only way a score reads exactly. MUI demo.' } } },
  render: (args) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {([
        ['Grill', 4.5],
        ['Fryer', 3],
        ['Expo', 5],
      ] as const).map(([station, score]) => (
        <Box key={station} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ width: 64 }} color="text.secondary">
            {station}
          </Typography>
          <Rating {...args} value={score} precision={0.5} readOnly />
          <Typography variant="body2" color="text.secondary">
            {score.toFixed(1)}
          </Typography>
        </Box>
      ))}
    </Box>
  ),
};

/** A custom icon in place of the star. */
export const CustomIcon: Story = {
  parameters: { docs: { description: { story: 'Any icon can replace the star. A scale like this needs a legend, which is one reason Birdie avoids it.' } } },
  render: (args) => (
    <Rating
      {...args}
      defaultValue={3}
      icon={<Whatshot fontSize="inherit" />}
      emptyIcon={<WhatshotBorder fontSize="inherit" />}
      sx={{ color: 'warning.main' }}
    />
  ),
};
