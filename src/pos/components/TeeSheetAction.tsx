import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { diffTeeSheet } from '../logic/state-diff';
import type { Change } from '../logic/state-diff';
import { ContextMenus } from './ContextMenus';
import { ModalContainerProvider } from '../modals/modal-container';
import { ModalHost } from '../modals/ModalHost';
import type { Action, Modal, PosState } from '../state/pos-store';
import { createInitialState, reducer } from '../state/pos-store';
import { PosProvider } from '../state/PosProvider';
import { Icon } from './primitives';
import { Stack } from './Stack';
import { TeeSheetView } from './TeeSheetView';

/**
 * One tee-sheet action, shown as what it does.
 *
 * Left: the sheet before, with the action's dialog over it. Right: the sheet after. Below:
 * what the action wrote.
 *
 * The "after" state is produced by running `apply` through the real reducer — not by
 * hand-authoring a second fixture. That matters because the alternative is a showcase that
 * looks authoritative while disagreeing with the app, which is worse than no showcase. The
 * change list underneath is likewise derived by diffing the two states, so it cannot claim
 * an outcome the reducer didn't produce.
 *
 * What it still can't prove on its own is that the dialog dispatches `apply` when you
 * confirm it. That's what the stories' `play` functions are for: they drive the real dialog
 * and check the left sheet ends up matching the right one.
 */
export function TeeSheetAction({
  before,
  modal,
  apply = [],
  beforeLabel = 'Before',
  afterLabel = 'After',
  note,
  paneHeight = 620,
}: {
  /** Starting sheet. Anything `createInitialState` accepts. */
  before?: Partial<PosState>;
  /** The dialog to show over the left pane. Omit for actions with no dialog. */
  modal?: Modal;
  /** What confirming the action dispatches. Run through the reducer to build the right pane. */
  apply?: Action[];
  beforeLabel?: string;
  afterLabel?: string;
  /** One line of context — why the action exists, or what to look at. */
  note?: string;
  /**
   * Height of each pane. Two sheets side by side don't need the full terminal height, but a
   * pane still has to be taller than the dialog it hosts, which now portals inside it.
   */
  paneHeight?: number;
}) {
  // The dialog portals here rather than to the body, so it lands over the left sheet
  // instead of floating between the two panes belonging to neither.
  const [paneEl, setPaneEl] = useState<HTMLDivElement | null>(null);

  const { beforeState, afterState, changes } = useMemo(() => {
    const start = createInitialState({ ...before, view: 'tee', leftPanelCollapsed: true });
    const end = apply.reduce(reducer, start);
    return { beforeState: start, afterState: end, changes: diffTeeSheet(start, end) };
    // `apply` and `before` are story-authored literals; a new array each render would
    // rebuild both states every frame, so this deliberately keys on their contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(before ?? {}), JSON.stringify(apply)]);

  return (
    <Stack gap={1.25} sx={{ width: '100%' }}>
      {note && (
        <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,.72)', lineHeight: 1.5 }}>
          {note}
        </Typography>
      )}

      <Stack direction="row" gap={1.25} sx={{ width: '100%', alignItems: 'stretch' }}>
        <Pane label={beforeLabel} tone="before" height={paneHeight} containerRef={setPaneEl}>
          <ModalContainerProvider container={paneEl}>
            <PosProvider initialState={{ ...beforeState, modal: modal ?? null }}>
              <TeeSheetView />
              <ModalHost />
              <ContextMenus />
            </PosProvider>
          </ModalContainerProvider>
        </Pane>

        <Pane label={afterLabel} tone="after" height={paneHeight}>
          <PosProvider initialState={{ ...afterState, modal: null }}>
            <TeeSheetView />
          </PosProvider>
        </Pane>
      </Stack>

      <ChangeList changes={changes} />
    </Stack>
  );
}

/** One framed sheet with a caption above it. */
function Pane({
  label,
  tone,
  height,
  containerRef,
  children,
}: {
  label: string;
  tone: 'before' | 'after';
  height: number;
  containerRef?: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={0.75} sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" alignItems="center" gap={0.75}>
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: tone === 'after' ? '#4ade80' : 'rgba(255,255,255,.45)',
          }}
        />
        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '.5px',
            textTransform: 'uppercase',
            color: tone === 'after' ? '#4ade80' : 'rgba(255,255,255,.6)',
          }}
        >
          {label}
        </Typography>
      </Stack>
      <Box
        ref={containerRef}
        // Marks the pane for the stories' before/after comparison.
        data-pane={tone}
        sx={{
          height,
          bgcolor: md3.surface,
          borderRadius: `${radius.md}px`,
          border: `1px solid ${md3.outlineVariant}`,
          display: 'flex',
          overflow: 'hidden',
          // The scoped dialog portal positions against this box.
          position: 'relative',
          color: md3.onSurface,
        }}
      >
        {children}
      </Box>
    </Stack>
  );
}

const TONE: Record<Change['kind'], { icon: string; color: string }> = {
  added: { icon: 'add_circle', color: '#16a34a' },
  removed: { icon: 'do_not_disturb_on', color: '#dc2626' },
  changed: { icon: 'change_circle', color: '#2563eb' },
  annotation: { icon: 'sticky_note_2', color: '#f59e0b' },
  course: { icon: 'golf_course', color: '#7c3aed' },
  setting: { icon: 'tune', color: md3.outline },
};

/** What the action wrote, derived from the two states rather than described by hand. */
function ChangeList({ changes }: { changes: Change[] }) {
  return (
    <Box
      sx={{
        border: `1px solid ${md3.outlineVariant}`,
        borderRadius: `${radius.md}px`,
        bgcolor: md3.surfaceContainer,
        p: 1.25,
      }}
    >
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '.5px',
          textTransform: 'uppercase',
          color: md3.onSurfaceVariant,
          mb: changes.length ? 0.75 : 0,
        }}
      >
        Writes to the tee sheet
      </Typography>
      {!changes.length ? (
        <Typography sx={{ fontSize: 12, color: md3.outline }}>
          Nothing — this action only changes what is shown.
        </Typography>
      ) : (
        <Stack gap={0.5}>
          {changes.map((c, i) => (
            <Stack key={i} direction="row" alignItems="flex-start" gap={0.75}>
              <Box sx={{ mt: '1px', flexShrink: 0 }}>
                <Icon name={TONE[c.kind].icon} size={13} color={TONE[c.kind].color} />
              </Box>
              <Typography sx={{ fontSize: 12, lineHeight: 1.45 }}>
                {c.label}
                {c.detail && (
                  <Box component="span" sx={{ color: md3.onSurfaceVariant }}>
                    {' · '}
                    {c.detail}
                  </Box>
                )}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default TeeSheetAction;
