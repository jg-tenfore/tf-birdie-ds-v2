import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Paper, Typography } from '@mui/material';
import tfLogo from '../../assets/images/tf-logo.svg';
import tfLogoWhite from '../../assets/images/tf-logo-white.svg';
import tfLogoBlack from '../../assets/images/tf-logo-black.svg';
import tfSquareColor from '../../assets/images/square/tf-square-color.svg';
import tfSquareWhite from '../../assets/images/square/tf-square-white.svg';
import tfSquareBlack from '../../assets/images/square/tf-square-black.svg';
import { md3 } from '../../theme/tokens';
import { Icon } from '../../pos/components/primitives';
import { Group, Sheet, mono } from './foundation-parts';

/**
 * Design System › Styles › Logos.
 *
 * The TenFore marks in `src/assets/images` (wordmark and square mark, colour / black / white),
 * and the rules for placing them. The write-up is
 * `src/showcase/ds-docs/content/foundations-logos.tsx`.
 */

type LogoSpec = { label: string; src: string; bg: string; file: string; onDark?: boolean };

const wordmarks: LogoSpec[] = [
  { label: 'Primary', src: tfLogo, bg: '#ffffff', file: 'tf-logo.svg' },
  { label: 'Black', src: tfLogoBlack, bg: '#ffffff', file: 'tf-logo-black.svg' },
  { label: 'White (reversed)', src: tfLogoWhite, bg: md3.scrim, file: 'tf-logo-white.svg', onDark: true },
];

const marks: LogoSpec[] = [
  { label: 'Colour', src: tfSquareColor, bg: '#ffffff', file: 'square/tf-square-color.svg' },
  { label: 'Black', src: tfSquareBlack, bg: '#ffffff', file: 'square/tf-square-black.svg' },
  { label: 'White (reversed)', src: tfSquareWhite, bg: md3.scrim, file: 'square/tf-square-white.svg', onDark: true },
];

function LogoCard({ spec, size }: { spec: LogoSpec; size: 'wordmark' | 'mark' }) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', width: size === 'mark' ? 168 : 260 }}>
      <Box sx={{ height: size === 'mark' ? 140 : 120, bgcolor: spec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box component="img" src={spec.src} alt={`TenFore logo, ${spec.label}`} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </Box>
      <Box sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {spec.label}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {spec.onDark ? 'On dark grounds (md3.scrim)' : 'On white and light grounds'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', fontFamily: mono, color: 'text.secondary' }}>
          {spec.file}
        </Typography>
      </Box>
    </Paper>
  );
}

function LogoSection({ title, hint, specs, size }: { title: string; hint: string; specs: LogoSpec[]; size: 'wordmark' | 'mark' }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
        {hint}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {specs.map((s) => (
          <LogoCard key={s.label} spec={s} size={size} />
        ))}
      </Box>
    </Box>
  );
}

function LogosGallery() {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <LogoSection title="Wordmark" hint="The full TenFore logo. For Storybook, documents and anything that introduces TenFore, never inside a working screen." specs={wordmarks} size="wordmark" />
      <LogoSection title="Square mark" hint="The TenFore mark alone, for app icons, avatars and tight spaces where the wordmark won't fit at its minimum size." specs={marks} size="mark" />
    </Box>
  );
}

const tile: CSSProperties = { width: 210, height: 110, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: `1.5px solid ${md3.outlineVariant}` };

const Misuse = ({ children, caption, style }: { children: ReactNode; caption: string; style?: CSSProperties }) => (
  <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ ...tile, ...style }}>
      {children}
      <span style={{ position: 'absolute', top: 6, right: 8, color: md3.error, fontSize: 16, fontWeight: 800 }}>✕</span>
    </div>
    <figcaption style={{ fontSize: 12.5, maxWidth: 210 }}>{caption}</figcaption>
  </figure>
);

function UsageRules() {
  return (
    <Sheet>
      <Group title="Clear space and minimum size" intro="Keep open space around the logo equal to half its height on every side, and nothing inside it. The wordmark is never smaller than 22px tall (its size in the Storybook sidebar); below that, use the square mark, never smaller than 24px.">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ padding: 27, border: `1.5px dashed ${md3.primary}`, background: 'repeating-linear-gradient(45deg,#f0fdf4 0 6px,#fff 6px 12px)', borderRadius: 8 }}>
            <img src={tfLogo} alt="TenFore wordmark with its clear space" style={{ display: 'block', height: 54, background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <img src={tfLogo} alt="TenFore wordmark at 22px" style={{ display: 'block', height: 22 }} />
            <span style={{ fontFamily: mono, fontSize: 11 }}>wordmark · 22px min</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <img src={tfSquareColor} alt="TenFore mark at 24px" style={{ display: 'block', height: 24, width: 'auto', alignSelf: 'flex-start' }} />
            <span style={{ fontFamily: mono, fontSize: 11 }}>mark · 24px min</span>
          </div>
        </div>
      </Group>

      <Group title="Don't" intro="The files are the logo. Use them as they are.">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Misuse caption="Stretch or squash it. Scale by height only.">
            <img src={tfLogo} alt="" style={{ width: 180, height: 30 }} />
          </Misuse>
          <Misuse caption="Recolour it, even to the POS green. The logo's green is its own.">
            <img src={tfLogo} alt="" style={{ height: 40, filter: 'hue-rotate(160deg) saturate(2)' }} />
          </Misuse>
          <Misuse caption="Put the colour version on a mid-tone or a photo. Use black or white." style={{ background: '#4caf82' }}>
            <img src={tfLogo} alt="" style={{ height: 40 }} />
          </Misuse>
          <Misuse caption="Use it as a heading or a decoration inside a working screen.">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: 10, width: '100%' }}>
              <img src={tfLogo} alt="" style={{ height: 16 }} />
              <span style={{ fontSize: 11, fontWeight: 800 }}>CHECK IN · REGISTER 1</span>
            </div>
          </Misuse>
        </div>
      </Group>

      <Group title="Inside Birdie: the club, not TenFore" intro="A working screen names the facility. Sign-in shows the product name beside a golf glyph and the facility as the heading; the logo files are not used inside the app.">
        <div style={{ background: md3.scrim, color: '#fff', borderRadius: 14, padding: 24, width: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="sports_golf" size={22} color={md3.primaryContainer} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.12em', color: md3.primaryContainer }}>TENFORE BIRDIE</span>
          </span>
          <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>The Dunes of Delgado</span>
        </div>
      </Group>
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Logos',
  id: 'foundations-logos',
  component: LogosGallery,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The TenFore wordmark and square mark, in colour, black and reversed white, and the rules for placing them.',
      },
    },
  },
} satisfies Meta<typeof LogosGallery>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Logos: Story = {
  parameters: { docs: { description: { story: 'The six files in src/assets/images, each on the ground it is made for.' } } },
};

export const UsageRules_: Story = {
  name: 'Clear space, size and misuse',
  render: () => <UsageRules />,
  parameters: { docs: { description: { story: "Birdie's working rules for placing the logo, until a TenFore brand guide says otherwise." } } },
};
