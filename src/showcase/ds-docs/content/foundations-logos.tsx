import { md3 } from '../../../theme/tokens';
import { ArtNote, Hex } from '../styles-kit';
import type { DsDoc } from '../types';

/**
 * Logos — the TenFore wordmark and square mark, where each is used (and where neither is),
 * clear space, minimum size and misuse. Reference sheets: src/showcase/foundations/Logos.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-logos',
  summary: (
    <>
      TenFore has two marks: the <strong>wordmark</strong> and the <strong>square mark</strong>, each in colour, black and reversed
      white (<code>src/assets/images</code>). They introduce TenFore: in this Storybook's sidebar, on documents, on an app icon. They
      don't appear inside a working Birdie screen. At the counter the screen names the club, The Dunes of Delgado, because that's
      whose shop it is.
      <ArtNote>Banner: a crest drawn on its construction circles, with its clear-space margin and its smallest size.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      A foundation, used outside the product: the Storybook sidebar (<code>.storybook/static/tenfore-logo.svg</code>) and the
      archived account screens. No Birdie screen imports a logo file, and there are no club logos in the repo.
    </>
  ),
  useFor: [
    'Introducing TenFore: the Storybook sidebar, documents, presentations, the sign-in of a TenFore account (not a club terminal).',
    'An app icon or avatar-sized space: the square mark.',
    'Dark grounds: the reversed white files, never the colour ones.',
  ],
  dontUseFor: [
    "A working screen's header or title. Name the facility instead.",
    'Decoration, a watermark or a pattern.',
    "A club's identity. Clubs are named in text until Birdie has club logos.",
  ],
  inBirdie: [
    {
      label: 'Sign-in, tablet',
      caption: (
        <>
          The terminal opens on the club, not the logo: TENFORE BIRDIE in tracked capitals beside a golf glyph, then the facility
          as the heading. The product is named; the brand mark stays off the working screens.
        </>
      ),
      shot: 'tablet-sign-in',
      storyId: 'v1-→-v2-migration-sign-in-tablet--demo-pins',
    },
    {
      label: 'The main nav, tablet',
      caption: (
        <>
          The menu's header names the facility, version and device, because a support call starts by asking for them. No logo
          competes with that information.
        </>
      ),
      shot: 'tablet-main-nav',
      tabletHash: '#/register?nav=1',
    },
  ],
  birdie: [
    { name: 'tenfore-logo.svg', file: '.storybook/static/tenfore-logo.svg', use: "the Storybook sidebar lockup (wordmark, hairline, \"Birdie / Design System\"), set in .storybook/manager.ts at 22px tall.", surface: 'both' },
    { name: 'tf-logo*.svg', file: 'src/assets/images/', use: 'the wordmark in colour, black and white.', surface: 'both' },
    { name: 'tf-square-*.svg', file: 'src/assets/images/square/', use: 'the square mark in colour, black and white; the archived Log in and Sign up stories use the colour one.', surface: 'both' },
  ],
  anatomy: [
    { part: 'Wordmark', description: 'The TenFore name with its mark, 200 × 54 (viewBox). The mark overlaps the T, so it is never cropped to a square: use the square mark instead.' },
    { part: 'Square mark', description: 'The mark alone, 64 × 60. For app icons, avatars and tight spaces.' },
    { part: 'Colour versions', description: <>Dark ink with the TenFore green <Hex c="#339C5D" /> in <code>src/assets/images</code>. The green is the brand's, not the POS green <Hex c={md3.primary} />.</> },
    { part: 'Clear space', description: 'Half the logo\'s height on every side, with nothing inside it (Birdie\'s working rule).' },
  ],
  variants: [
    { name: 'Colour', use: 'White and light grounds (white, surface).', avoid: 'Mid-tones, colour fills and photos.' },
    { name: 'Black', use: 'Light grounds where colour isn\'t available or would clash (one-colour print, a coloured page).', avoid: 'Dark grounds.' },
    { name: 'White (reversed)', use: <>Dark grounds: <code>md3.scrim</code>, a dark photo.</>, avoid: 'Light grounds.' },
    { name: 'Square mark', use: 'Where the wordmark would be under 22px tall: an app icon, a favicon, an avatar.', avoid: 'Where the wordmark fits; the name is the point.' },
  ],
  sizing: [
    { surface: 'Docs and Storybook', size: 'Wordmark ≥ 22px tall; square mark ≥ 24px', why: 'At 22px (the sidebar) the wordmark\'s letters still resolve; below that, switch to the mark.' },
    { surface: 'Tablet and handheld', size: 'Not used in working screens', why: 'The screen belongs to the club. The facility name is the heading.' },
  ],
  behavior: [
    'Scale by height only, and keep the file\'s aspect ratio.',
    'Pick the version by the ground: colour on light, white on dark, black when colour can\'t be used.',
  ],
  dos: [
    'Use the SVG files as they are, from src/assets/images.',
    'Give the logo its clear space.',
    'Give it alt text: "TenFore" (the file already carries role="img" and an aria-label in the sidebar version).',
  ],
  donts: [
    'Stretch, squash, rotate, outline or add effects.',
    'Recolour it, even to the POS green.',
    'Put the colour version on a mid-tone, a category fill or a photo.',
    'Use it as a heading or decoration inside a working screen.',
    'Crop the wordmark to its mark.',
  ],
  a11y: [
    'A logo image needs alt text naming the company ("TenFore"). When the logo is a link (the sidebar brand links to Start Here), the alt text is the link\'s name.',
    'Decorative repeats of a logo get empty alt text so a screen reader doesn\'t announce it twice.',
  ],
  decisions: [
    { decision: 'No logo inside the product', why: 'At the counter the screen names the club; a support call needs the facility, version and device, which the main nav header shows. Sign-in uses a golf glyph and the product name instead of a logo file.' },
    { decision: 'The wordmark is never cropped', why: ".storybook/manager.ts: the mark's antlers overlap the T and don't survive a crop, so the sidebar keeps the whole wordmark at 22px." },
    { decision: 'Open: two primary wordmarks', why: <>The sidebar's <code>tenfore-logo.svg</code> uses <Hex c="#3EA563" /> and <Hex c="#181D27" />; <code>src/assets/images/tf-logo.svg</code> uses <Hex c="#339C5D" /> and black. One of them is out of date. Pick the brand's file and use it in both places.</> },
    { decision: 'Open: the favicon is a placeholder', why: <><code>public/favicon.svg</code> is the build tool's default purple mark, so the prototype's browser tab shows no TenFore icon. Replace it with the square mark.</> },
    { decision: 'Open: no brand guide in the repo', why: 'Clear space and minimum sizes here are Birdie\'s working rules. When TenFore has a brand guide, link it and adopt its numbers.' },
    { decision: 'Open: club logos', why: 'Clubs are text only today. If a club\'s crest ever appears (receipts, sign-in), it needs its own slot, size and fallback, decided before the first one arrives.' },
  ],
  engineering: {
    import: `import tfLogo from '../../assets/images/tf-logo.svg';
import tfMark from '../../assets/images/square/tf-square-color.svg';`,
    notes: [
      <>
        Import the SVGs through Vite (as above), so the URL is content-hashed and works under the Pages base path. The Storybook
        manager can't import from <code>src/</code>, so its logo is a static file addressed relatively (<code>tenfore-logo.svg</code>).
      </>,
      <>The archived <code>Log in</code> story still says "Sign in to Goose KDS" beside the TenFore mark, a leftover from the repo this was scaffolded from.</>,
    ],
    snippet: `<Box component="img" src={tfLogo} alt="TenFore" sx={{ height: 22, width: 'auto', display: 'block' }} />`,
  },
  related: [
    { name: 'Images', id: 'foundations-images' },
    { name: 'Colors', id: 'foundations-colors' },
    { name: 'Icons', id: 'foundations-icons' },
    { name: 'Avatar', id: 'components-media-visuals-avatar' },
  ],
};

export default doc;
