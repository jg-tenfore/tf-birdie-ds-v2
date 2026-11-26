import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Link, Stack, Typography } from '@mui/material';
import OpenInNew from '@mui/icons-material/OpenInNew';

const meta = {
  title: 'Design System/Components/Navigation/Link',
  id: 'components-navigation-link',
  component: Link,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Link`, an anchor. Birdie doesn’t import it: its in-app links are text actions on `ButtonBase` (a paid ' +
          'reservation’s order number opens that order in Order Lookup), because moving in Birdie is a store action, not a URL. ' +
          'Use MUI Link only for a real URL. Control `underline`, `color` and `variant` below.',
      },
    },
  },
  argTypes: {
    children: { control: 'text', description: 'Link text.' },
    underline: {
      control: 'inline-radio',
      options: ['none', 'hover', 'always'],
      description: 'When the underline appears.',
      table: { defaultValue: { summary: 'always' } },
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'textPrimary', 'textSecondary', 'error', 'inherit'],
      description: 'Semantic text color.',
      table: { defaultValue: { summary: 'primary' } },
    },
    variant: {
      control: 'select',
      options: ['body1', 'body2', 'subtitle1', 'button', 'caption'],
      description: 'Typography scale.',
      table: { defaultValue: { summary: 'inherit' } },
    },
  },
  args: {
    children: 'Order #A-34768',
    underline: 'always',
    color: 'primary',
    variant: 'body1',
  },
} satisfies Meta<typeof Link>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Fully interactive — change any prop in the **Controls** panel. */
export const Playground: Story = {
  render: (args) => <Link href="#" {...args} />,
};

/** A link reads naturally inside body copy. */
export const WithinParagraph: Story = {
  parameters: { docs: { description: { story: 'An inline link inside a sentence of running text.' } } },
  render: () => (
    <Typography variant="body1" sx={{ maxWidth: 420 }}>
      Reed, M. paid in full. Open{' '}
      <Link href="#" underline="hover">
        order #A-34768
      </Link>{' '}
      to reprint the receipt or refund a line.
    </Typography>
  ),
};

/** A row of standalone links, e.g. a footer or quick-jump strip. */
export const RowOfLinks: Story = {
  parameters: { docs: { description: { story: 'Several links laid out horizontally as a quick-jump strip.' } } },
  render: () => (
    <Stack direction="row" spacing={3}>
      <Link href="#" underline="hover">Tee Sheet</Link>
      <Link href="#" underline="hover">Register</Link>
      <Link href="#" underline="hover">Order Lookup</Link>
      <Link href="#" underline="hover">Settings</Link>
    </Stack>
  ),
};

/** Pair a link with a trailing icon to signal an external or new-tab destination. */
export const WithIcon: Story = {
  parameters: { docs: { description: { story: 'A link with a trailing icon indicating it opens elsewhere.' } } },
  render: () => (
    <Link
      href="#"
      underline="hover"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
    >
      Open the help article
      <OpenInNew fontSize="small" />
    </Link>
  ),
};

/** Semantic colors map links to context — primary for nav, error for destructive references. */
export const Colors: Story = {
  parameters: { docs: { description: { story: 'The same link across the semantic color options.' } } },
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Link href="#" color="primary">Primary — view order</Link>
      <Link href="#" color="secondary">Secondary — view the booking</Link>
      <Link href="#" color="textPrimary">Text primary — inline reference</Link>
      <Link href="#" color="error">Error — see the refused payment</Link>
    </Box>
  ),
};
