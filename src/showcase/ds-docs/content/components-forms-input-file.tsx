import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** Input File: the browser's file field. Nothing at the counter or on the handheld takes a file. */
const doc: DsDoc = {
  summary: (
    <>
      A field that opens the device's file browser so someone can attach a file: a photo, a document, an import.{' '}
      <strong>Nothing in Birdie takes a file</strong>, on the counter or on the handheld. A counter terminal has no files an
      operator would browse to, and the things that would need one (menu photos, receipt logos, imports) belong to the club's back
      office, Buck, where menus and settings are kept.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Avoid on both surfaces. If a screen seems to need a file, the job probably belongs in Buck. Anything that reads a card or a
      code uses a scanner into a search field ("Scan or type the card"), not a file.
    </>
  ),
  mui: [],
  useFor: [
    'Nothing in Birdie today.',
    'If ever: a back-office screen in Buck, on a desktop, where someone has the file at hand.',
  ],
  dontUseFor: [
    'Gift cards, member cards or codes: scan into a search field.',
    'Photos at the counter: there is no camera or file flow in Birdie, and dish photos come with the menu.',
  ],
  anatomy: [
    { part: 'Label', description: '"Attach file", above the field.' },
    { part: 'Button', description: 'The browser\'s own "Choose file" button.' },
    { part: 'File name', description: 'The chosen file\'s name, or "No file chosen".' },
  ],
  variants: [
    { name: 'Native file field (type="file")', use: 'Nothing in Birdie.', avoid: 'The counter and the handheld.' },
    { name: 'File Upload (drop zone)', use: 'See File Upload: also unused.', avoid: 'The same.' },
  ],
  states: [
    { state: 'Empty', tablet: '"No file chosen".', handheld: 'Not used.' },
    { state: 'Chosen', tablet: 'The file name.', handheld: '—' },
  ],
  behavior: ['Choosing a file does nothing until a form saves it. There is nowhere in Birdie that saves one.'],
  dos: ['Send file work to Buck.', 'Scan codes into search fields.'],
  donts: ['A file field on the counter or the handheld.'],
  a11y: [
    'The native file input is keyboard and screen-reader accessible on its own; a visible label must be bound to it.',
    <>The demo's label and text use the field's colours, <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />.</>,
  ],
  decisions: [
    {
      decision: 'Avoid',
      why: 'Taxes, tenders and receipt text are set in Buck and shown read-only at the counter (Settings › Set in Buck), and the menus are Buck\'s too (MenuBrowser names each Buck menu). The prototype\'s dish photos are files named after each dish in src/assets/menu, not uploads.',
    },
  ],
  engineering: {
    themeOverride: <>None. The story renders a MUI <code>TextField type="file"</code> with the label shrunk, under the tablet theme.</>,
    notes: [<>No Birdie screen has an <code>&lt;input type="file"&gt;</code>; checked across <code>src/pos</code>.</>],
  },
  related: [
    { name: 'File Upload', id: 'components-forms-file-upload' },
    { name: 'File Upload Trigger', id: 'components-forms-file-upload-trigger' },
    { name: 'Text Field', id: 'components-forms-text-field' },
  ],
};

export default doc;
