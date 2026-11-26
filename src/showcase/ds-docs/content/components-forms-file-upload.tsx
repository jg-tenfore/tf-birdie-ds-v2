import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * File Upload — a dashed drop zone with a Browse button and a progress list. Birdie runs on
 * counter terminals and handhelds, where nobody drags a file anywhere, and takes no files at all.
 */
const doc: DsDoc = {
  summary: (
    <>
      A <strong>drop zone</strong>: a dashed box that takes files dragged onto it, a Browse button, and a list of uploads
      with progress. It is a desktop pattern, and <strong>Birdie takes no files</strong>. It runs on a counter terminal
      and a handheld, where there is no file manager to drag from. What would need a file (a club's logo, a menu photo, a
      price list) is set up in the back office, not at the counter.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Not used, and the wrong shape for a terminal. If a flow ever needs a file or a photo, use File Upload Trigger (a
      button that opens the device's own chooser or camera), never a drop zone.
    </>
  ),
  useFor: [
    'Nothing in Birdie today.',
    'Desktop back-office tools, which are not Birdie.',
  ],
  dontUseFor: [
    'Anything on the counter terminal or the handheld: there is nothing to drag from.',
    'A photo on the handheld: use File Upload Trigger, which can open the camera.',
    'Club configuration: Settings shows what is "Set in Buck" read-only and says where it is changed.',
    'Menu photos: they ship with the app, named after each dish (src/pos/data/menu-images.ts).',
  ],
  inBirdie: [
    {
      label: 'Instead: set in the back office',
      caption: (
        <>
          Settings splits what the counter can change from what is <strong>Set in Buck</strong>. Taxes, payments, printers
          and receipt text are shown read-only, each saying where in Buck it is changed. A file would live there too.
        </>
      ),
      shot: 'tablet-settings-buck',
      tabletHash: '#/settings?section=taxes',
    },
  ],
  anatomy: [
    { part: 'Drop zone', description: 'A dashed outlined Paper with an upload icon and "Drag & drop files here, or".' },
    { part: 'Browse', description: 'An outlined button wrapping a hidden file input.' },
    { part: 'Upload list', description: 'A file icon, the name, and its progress as text and a bar.' },
  ],
  variants: [
    { name: 'Drop zone with list', use: 'Not in Birdie.', avoid: 'Terminals and handhelds.' },
    {
      name: 'Button only',
      use: 'The only upload shape that works on Birdie\'s devices, if one is ever needed. See File Upload Trigger.',
    },
  ],
  states: [
    { state: 'Idle', tablet: 'Dashed box, waiting for a drag that never comes.', handheld: 'Same; the drop zone does nothing on touch.' },
    { state: 'Dragging over', tablet: 'Not styled in the story.', handheld: 'Not possible.' },
    { state: 'Uploading', tablet: 'A row with "uploading… 65%" and a bar.', handheld: 'Same.' },
    { state: 'Error', tablet: 'Not designed.', handheld: 'Not designed.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'A 380px box in the story', why: 'Takes the room of a whole form section for something a button does in one line.' },
    { surface: 'Handheld', size: 'Not applicable', why: 'No drag and drop on a touch screen.' },
  ],
  behavior: [
    'Dragging files onto the zone, or Browse, starts the upload. Progress shows per file.',
    'Nothing in Birdie handles a file, so nothing would happen after it.',
  ],
  dos: [
    'Ask whether the file belongs in the back office before designing it into the counter.',
    'If a photo is ever needed on the handheld, use a button that opens the camera.',
  ],
  donts: [
    'A drop zone on a terminal or handheld.',
    'Asking staff at the counter to manage files.',
  ],
  a11y: [
    'The drop zone itself is not focusable; only Browse is. Anything the zone says must also be true of the button.',
    <>
      Contrast, computed: the helper text is <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />. The dashed outline is a
      hint, not a control, so its low contrast matters less than the button's.
    </>,
  ],
  decisions: [
    {
      decision: 'No file intake at the counter',
      why: 'Birdie\'s devices have no files to give, and the settings that would take one are owned by the back office. Settings already shows them read-only under "Set in Buck" (SettingsView.tsx).',
    },
    {
      decision: 'Avoid, and a candidate to remove',
      why: 'The story is a generic MUI composition with no Birdie use. Keeping it invites a drop zone into a touch product.',
    },
  ],
  engineering: {
    import: `// No Birdie import. The story composes Paper, Button and LinearProgress from @mui/material.`,
    themeOverride: <>None specific. It inherits <code>MuiPaper</code>, <code>MuiButton</code> and the palette.</>,
    notes: [
      <>
        If a photo is ever needed, start from the trigger: an outlined button wrapping{' '}
        <code>{'<input type="file" accept="image/*" capture="environment" hidden>'}</code>. On Android it opens the camera.
      </>,
    ],
  },
  related: [
    { name: 'File Upload Trigger', id: 'components-forms-file-upload-trigger' },
    { name: 'Input File', id: 'components-forms-input-file' },
    { name: 'Progress Indicators', id: 'components-feedback-status-progress-indicators' },
    { name: 'Button', id: 'components-actions-button' },
  ],
};

export default doc;
