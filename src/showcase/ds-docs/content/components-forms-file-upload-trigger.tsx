import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * File Upload Trigger — a button that opens the device's own file chooser. Unused, but it is the one
 * upload shape that works on Birdie's devices, so it is the one to start from if a flow needs it.
 */
const doc: DsDoc = {
  summary: (
    <>
      A <strong>button that opens the device's own file chooser</strong>: an outlined "Upload file" with a hidden file
      input inside it. Birdie takes no files today. If a flow ever needs one, this is the shape to use: on the handheld it
      opens Android's chooser, which can offer the camera, and it takes one line instead of a drop zone's box.
    </>
  ),
  status: 'available',
  statusNote: (
    <>
      Not used by any Birdie screen. Fine to adopt for the rare case, such as a photo taken on the handheld. Never use the
      drop zone (File Upload) on Birdie's devices.
    </>
  ),
  useFor: [
    'A photo or document a flow genuinely needs, taken on the device.',
    'One file at a time, with what happens next shown right after.',
  ],
  dontUseFor: [
    'Club setup (logos, price lists, menu photos): that is the back office, not the counter.',
    'A drag-and-drop zone: Birdie\'s devices have nothing to drag. See File Upload.',
    'Several files at once: no Birdie flow needs a batch.',
  ],
  anatomy: [
    { part: 'Button', description: 'Outlined, with a leading upload icon and a verb: "Upload file", or better, what it is: "Add photo".' },
    { part: 'Hidden input', description: 'A visually hidden <input type="file"> inside the button\'s label, so a click on the button opens the chooser.' },
    { part: 'Result (to design)', description: 'What was picked, shown beside the button: a file name or a thumbnail, with Remove.' },
  ],
  variants: [
    {
      name: 'Outlined trigger',
      use: 'A secondary action inside a form or a record.',
      avoid: 'As the main action of a screen. Taking a file is rarely the point.',
    },
    {
      name: 'Camera trigger (handheld)',
      use: 'accept="image/*" with capture, so Android opens the camera first.',
      avoid: 'Asking for documents the device can\'t have.',
    },
  ],
  states: [
    { state: 'Default', tablet: 'An outlined pill at button size (34px).', handheld: 'At touch size (40dp and up), like other outlined buttons.' },
    { state: 'Choosing', tablet: "The operating system's chooser, over the app.", handheld: "Android's chooser or the camera. The app waits." },
    { state: 'Chosen', tablet: 'Not designed yet: show the name and a way to remove it.', handheld: 'Not designed yet: a thumbnail for a photo.' },
    { state: 'Disabled', tablet: 'Greyed, with the reason nearby, as for any button.', handheld: 'Same.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '34px, the theme\'s small button', why: 'It sits among dialog actions.' },
    { surface: 'Handheld', size: '40dp and up', why: 'The handheld theme\'s button sizes; a thumb opens it.' },
  ],
  behavior: [
    'A click or tap opens the chooser. Nothing uploads until something is picked.',
    'Say what was picked straight away, next to the button.',
    'One file per trigger unless the flow really needs several.',
  ],
  content: [
    'Name the thing, not the mechanism: "Add photo", "Attach receipt", rather than "Upload file".',
    'Sentence case, like every button.',
  ],
  dos: [
    'Use accept to limit the chooser to what the flow can use.',
    'Open the camera on the handheld when a photo is what is needed.',
    'Show the result and a way to undo it.',
  ],
  donts: [
    'A drop zone around it.',
    'A trigger with no visible result after choosing.',
    'Uploading at the counter what belongs in the back office.',
  ],
  a11y: [
    <>
      The input is hidden with a clip, not <code>display: none</code>, so it stays in the accessibility tree; the button's
      text names it. Keep it that way.
    </>,
    'After choosing, announce the result (the file name) so a screen reader user knows it worked.',
    <>
      Contrast, computed: an outlined button's label on the handheld is <Contrast fg={md3.primary} bg={md3.surface} />, the
      green-text gap the Button page tracks. On the tablet, Birdie's own outlined buttons use{' '}
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />.
    </>,
  ],
  decisions: [
    {
      decision: 'Available, not avoid',
      why: 'A button that opens the device\'s chooser works on a terminal and a handheld. It is the right shape if the need ever comes, unlike the drop zone.',
    },
    {
      decision: 'No current use',
      why: 'Birdie has no file intake (no type="file" anywhere in src/pos). Club setup is shown read-only under "Set in Buck", and menu photos ship with the app.',
    },
  ],
  engineering: {
    import: `import { Button, styled } from '@mui/material';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiButton</code> (pill, small, 600 weight, 1.5px outline) and the handheld sizes in{' '}
        <code>src/theme/mobile-theme.ts</code>.
      </>
    ),
    notes: [
      <>
        Use <code>component="label"</code> on the Button so a click anywhere on it opens the input. The story's{' '}
        <code>HiddenInput</code> is the accessible way to hide it.
      </>,
      'On the tablet, prefer Birdie\'s OutlineButton look for consistency with dialog actions if this lands in a ModalFrame footer.',
    ],
    snippet: `<Button component="label" variant="outlined" startIcon={<PhotoCamera />}>
  Add photo
  <HiddenInput type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
</Button>`,
  },
  related: [
    { name: 'File Upload', id: 'components-forms-file-upload' },
    { name: 'Input File', id: 'components-forms-input-file' },
    { name: 'Button', id: 'components-actions-button' },
  ],
};

export default doc;
