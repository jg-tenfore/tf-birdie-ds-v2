import { useState } from 'react';
import { Box, Button, ButtonBase, TextField, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import StickyNote2Outlined from '@mui/icons-material/StickyNote2Outlined';
import { md3, noteColors, radius } from '../../../../theme/tokens';
import type { NoteColorKey } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import { timeRowKey } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { FormSection, PickerField } from './parts';
import { shortDate, timeOptions } from './people-utils';

const COLOR_NAMES: Record<NoteColorKey, string> = {
  yellow: 'Yellow',
  blue: 'Blue',
  green: 'Green',
  purple: 'Purple',
  red: 'Red',
};

/**
 * Annotate a time row. Full-screen dialog: ✕ discards, Save writes the note and closes
 * back to the tee sheet. An existing note opens pre-filled, with Delete at the foot of
 * the form — destructive actions stay out of the top bar, where Save lives.
 */
export function TimeNoteScreen({ route }: ScreenProps<'timeNote'>) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const [start, setStart] = useState(route.timeMin);
  const key = timeRowKey(state.currentDate, start);
  const existing = state.timeNotes[key];

  const [text, setText] = useState(existing?.text ?? '');
  const [color, setColor] = useState<NoteColorKey>(existing?.color ?? 'yellow');
  const c = noteColors[color];

  return (
    <MobileScreen
      topBar={
        <DialogTopBar
          title={existing ? 'Edit note' : 'Add note'}
          confirmDisabled={!text.trim()}
          onConfirm={() => {
            dispatch({ type: 'setTimeNote', key, note: { text: text.trim(), color } });
            nav.pop();
            toast(`Note saved · ${formatTimeLabel(start)}`);
          }}
        />
      }
    >
      <FormSection title="Tee time" hint={shortDate(state.currentDate)}>
        <PickerField label="Tee time" value={start} options={timeOptions()} onChange={setStart} />
      </FormSection>

      <FormSection title="Note">
        <TextField
          multiline
          sx={{ '& .MuiOutlinedInput-root': { p: 0 } }}
          minRows={3}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Lightning hold — resume when cleared"
          slotProps={{ htmlInput: { 'aria-label': 'Note' } }}
        />
      </FormSection>

      <FormSection title="Colour">
        <Stack direction="row" gap={1.5} role="radiogroup" aria-label="Note colour">
          {(Object.keys(noteColors) as NoteColorKey[]).map((k) => (
            <ButtonBase
              key={k}
              role="radio"
              aria-checked={color === k}
              aria-label={COLOR_NAMES[k]}
              onClick={() => setColor(k)}
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: noteColors[k].bg,
                border: `2px solid ${color === k ? noteColors[k].dot : noteColors[k].border}`,
              }}
            >
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: noteColors[k].dot, display: 'grid', placeItems: 'center', color: md3.onPrimary }}>
                {color === k && <Check sx={{ fontSize: 16 }} />}
              </Box>
            </ButtonBase>
          ))}
        </Stack>
      </FormSection>

      <FormSection title="Preview" hint="How the row reads on the tee sheet">
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{ p: 1.5, bgcolor: c.bg, border: `1px solid ${c.border}`, borderRadius: `${radius.md}px`, color: c.text }}
        >
          <StickyNote2Outlined sx={{ fontSize: 18, color: c.dot }} />
          <Typography variant="subtitle2" sx={{ color: c.text, flexShrink: 0 }}>
            {formatTimeLabel(start)}
          </Typography>
          <Typography variant="body2" noWrap sx={{ color: c.text, minWidth: 0 }}>
            {text.trim() || 'Your note'}
          </Typography>
        </Stack>
      </FormSection>

      {existing && (
        <Box sx={{ px: 2, pt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<DeleteOutlined />}
            onClick={() => {
              dispatch({ type: 'setTimeNote', key, note: null });
              nav.pop();
              toast('Note removed');
            }}
            sx={{ color: md3.error, borderColor: md3.outlineVariant }}
          >
            Delete note
          </Button>
        </Box>
      )}
      <Box sx={{ height: 32 }} />
    </MobileScreen>
  );
}
