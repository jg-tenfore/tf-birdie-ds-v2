import type { Preview } from '@storybook/react-vite';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import '@fontsource-variable/roboto';
import { theme } from '../src/theme';

/**
 * Birdie POS is a fixed-size counter terminal, not a responsive app: the prototype's
 * shell is 1366×840 and never reflows. Stories therefore default to that frame, and
 * the viewport control offers the neighbouring hardware sizes rather than phones.
 */
const POS_VIEWPORTS = {
  counterTerminal: {
    name: 'Counter terminal · 1366×840',
    styles: { width: '1366px', height: '840px' },
    type: 'desktop' as const,
  },
  tabletLandscape: {
    name: 'Tablet · Landscape',
    styles: { width: '1280px', height: '800px' },
    type: 'tablet' as const,
  },
  ipadLandscape: {
    name: 'iPad · Landscape',
    styles: { width: '1024px', height: '768px' },
    type: 'tablet' as const,
  },
};

const preview: Preview = {
  // Every story gets a Docs page.
  tags: ['autodocs'],
  initialGlobals: {
    viewport: { value: 'counterTerminal', isRotated: false },
  },
  parameters: {
    viewport: { options: POS_VIEWPORTS },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: {
      // 'todo' surfaces violations in the test UI without failing CI.
      test: 'todo',
    },
    // Explicit sidebar order — Storybook sorts alphabetically otherwise.
    options: {
      storySort: {
        order: [
          'Getting Started',
          ['Introduction'],
          'Foundations',
          ['Colors', 'Typography', 'Spacing', 'Radius', 'Border', 'Effect Styles', 'Icons', 'Logos', 'Images'],
          'Components',
          [
            'Actions',
            'Navigation',
            'Forms',
            'Feedback & Status',
            'Layout & Structure',
            'Media & Visuals',
            'Typography & Content',
          ],
          'App Chrome',
          'Account',
          ['Log in', 'Sign up', 'Forgot password', 'Verification'],
          'POS Screens',
          [
            '1 · Register & Order',
            ['Empty Register', 'Category & Items', 'Walk-in Order', 'Loaded Tee Time', 'Per-player Modifiers', 'Order Settings'],
            '2 · Tee Sheet',
            ['Calendar Grid', 'Compact & Bands', 'Blocks & Events', 'List View', 'Filters', 'Day Summary'],
            '3 · Booking & Check-in',
            ['Booking Detail', 'Players & Status', 'Financial', 'Group Notes', 'Activity', 'New Tee Time'],
            '4 · Tee Time Selection',
            ['Tee Picker', 'Eighteen Holes', 'Reserve Confirmation'],
            '5 · Payment',
            ['Checkout', 'Tip & Change', 'Payment Reader'],
            '6 · Operations',
            ['Block Time', 'Time Note', 'Price Override', 'League & Outing', 'Move Players', 'Rate Card', 'Multi-select'],
            '7 · People',
            ['Member Lookup', 'Golfer Search', 'Guest Detail', 'New Customer', 'Action Panel'],
          ],
          '*',
        ],
      },
    },
  },
  // Every story renders inside the POS theme plus a date-picker localization
  // context, so MUI and MUI X components are themed and functional everywhere.
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Story />
        </LocalizationProvider>
      </ThemeProvider>
    ),
  ],
};

export default preview;
