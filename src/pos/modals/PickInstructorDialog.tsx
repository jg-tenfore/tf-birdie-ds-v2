import { Box, Typography } from '@mui/material';
import { md3 } from '../../theme/tokens';
import type { CheckoutModal } from '../state/checkout';
import { lessonChoices } from '../state/credit-ledger';
import { usePos } from '../state/PosProvider';
import { ModalFrame, OutlineButton, ResultList, ResultRow } from './ModalFrame';

/**
 * Ringing up a lesson (Nov 26 decision): **which instructor is it with?** The line carries the answer,
 * and a lesson credit pays only its own instructor's lessons — Buck's packs are bought per instructor.
 *
 * When the order has a customer, each instructor shows how many of their credits of this length the
 * customer holds, so the lesson is rung up with the instructor the credit will pay for.
 */
export function PickInstructorDialog({ m }: { m: Extract<CheckoutModal, { kind: 'pickInstructor' }> }) {
  const { state, dispatch, toast } = usePos();
  const choices = lessonChoices(state, m.name);
  const close = () => dispatch({ type: 'closeModal' });
  return (
    <ModalFrame
      width={460}
      title={m.name}
      subtitle="Who is the lesson with?"
      icon="school"
      onClose={close}
      actions={<OutlineButton onClick={close}>Cancel</OutlineButton>}
    >
      <ResultList maxHeight={320}>
        {choices.map(({ instructor, credits }) => (
          <Box key={instructor.id} data-instructor-option={instructor.id} data-instructor-credits={credits} sx={{ display: 'contents' }}>
            <ResultRow
              primary={instructor.name}
              secondary={instructor.title}
              badge={credits > 0 ? `${credits} credit${credits === 1 ? '' : 's'}` : undefined}
              badgeColor={md3.onPrimaryContainer}
              badgeBg={md3.primaryContainer}
              onClick={() => {
                dispatch({ type: 'addLesson', name: m.name, price: m.price, instructorId: instructor.id });
                close();
                toast(`Added: ${m.name} · ${instructor.name}`);
              }}
            />
          </Box>
        ))}
      </ResultList>
      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 1 }}>A lesson credit pays only its own instructor’s lessons.</Typography>
    </ModalFrame>
  );
}
