import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumbs, Link, Typography } from '@mui/material';

const meta = {
  title: 'Design System/Components/Navigation/Breadcrumbs',
  id: 'components-navigation-breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
} satisfies Meta<typeof Breadcrumbs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Breadcrumbs_: Story = {
  name: 'Breadcrumbs',
  render: () => (
    <Breadcrumbs>
      <Link underline="hover" color="inherit" href="#">
        Buck
      </Link>
      <Link underline="hover" color="inherit" href="#">
        Course Settings
      </Link>
      <Typography color="text.primary">Taxes & Fees</Typography>
    </Breadcrumbs>
  ),
};
