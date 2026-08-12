import { Box, ButtonBase, Switch, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { usePos } from '../state/PosProvider';
import type { TeeSheetSettings } from '../types';
import { Icon, SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * The tee sheet's display settings panel (the tune icon in the toolbar).
 *
 * These are per-terminal view preferences, not club configuration — interval and
 * hours change what the *grid* shows, while a course's actual bookable window lives
 * in its own Time Settings dialog. Keeping them separate is deliberate: an operator
 * can compress the view to scan a busy day without touching what's sellable.
 */
export function TeeSheetSettingsPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch, toast } = usePos();
  const s = state.settings;

  const set = <K extends keyof TeeSheetSettings>(key: K, val: TeeSheetSettings[K], msg?: string) => {
    dispatch({ type: 'patchSettings', patch: { [key]: val } as Partial<TeeSheetSettings> });
    if (msg) toast(msg);
  };

  return (
    <>
      <Box onClick={onClose} sx={{ position: 'fixed', inset: 0, zIndex: 399 }} />
      <Box
        sx={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 300,
          maxHeight: 480,
          overflowY: 'auto',
          bgcolor: '#fff',
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.lg}px`,
          boxShadow: '0 4px 8px 3px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.12)',
          zIndex: 400,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: '12px 14px', borderBottom: `1px solid ${md3.outlineVariant}` }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>Tee sheet settings</Typography>
          <ButtonBase onClick={onClose} sx={{ p: 0.5, borderRadius: '50%' }}>
            <Icon name="close" size={16} />
          </ButtonBase>
        </Stack>

        <Group icon="view_column" color="#2563eb" label="Density">
          <ToggleRow
            label="Compact rows"
            desc="30px rows, name only — fits a full day on screen"
            checked={s.compactMode}
            onChange={(v) => set('compactMode', v, v ? 'Compact rows on' : 'Compact rows off')}
          />
          <ToggleRow
            label="Hide empty rows"
            desc="Skip time rows with no bookings on any course"
            checked={s.hideEmpty}
            onChange={(v) => set('hideEmpty', v, v ? 'Empty rows hidden' : 'Showing all rows')}
          />
        </Group>

        <Group icon="schedule" color="#16a34a" label="Grid">
          <Segmented
            label="Interval"
            value={s.intervalMins}
            options={[
              { label: '7 min', value: 7 },
              { label: '8 min', value: 8 },
              { label: '10 min', value: 10 },
              { label: '15 min', value: 15 },
            ]}
            onChange={(v) => set('intervalMins', v, `${v}-minute intervals`)}
          />
          <Segmented
            label="Start hour"
            value={s.gridStartHour}
            options={[
              { label: '5 AM', value: 5 },
              { label: '6 AM', value: 6 },
              { label: '7 AM', value: 7 },
            ]}
            onChange={(v) => set('gridStartHour', v)}
          />
          <Segmented
            label="End hour"
            value={s.gridEndHour}
            options={[
              { label: '6 PM', value: 18 },
              { label: '7 PM', value: 19 },
              { label: '8 PM', value: 20 },
            ]}
            onChange={(v) => set('gridEndHour', v)}
          />
        </Group>

        <Group icon="tune" color="#7c3aed" label="Behaviour">
          <ToggleRow
            label="Auto-scroll to now"
            desc="Open the sheet at the current time instead of the top"
            checked={s.autoScrollNow}
            onChange={(v) => set('autoScrollNow', v)}
          />
          <ToggleRow
            label="Colourblind mode"
            desc="Lean on labels and patterns rather than hue alone"
            checked={s.colorblindMode}
            onChange={(v) => set('colorblindMode', v, v ? 'Colourblind mode on' : 'Colourblind mode off')}
          />
        </Group>

        <Box sx={{ p: '10px 14px', borderTop: `1px solid ${md3.outlineVariant}` }}>
          <ButtonBase
            onClick={() => {
              dispatch({ type: 'resetSettings' });
              toast('Settings reset to defaults');
            }}
            sx={{
              width: '100%',
              gap: 0.75,
              py: 1,
              borderRadius: `${radius.md}px`,
              border: `1.5px solid ${md3.outlineVariant}`,
              fontSize: 12,
              fontWeight: 700,
              color: md3.onSurfaceVariant,
              '&:hover': { bgcolor: md3.surfaceContainer },
            }}
          >
            <Icon name="restart_alt" size={15} />
            Reset to defaults
          </ButtonBase>
        </Box>
      </Box>
    </>
  );
}

function Group({
  icon,
  color,
  label,
  children,
}: {
  icon: string;
  color: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ p: '10px 14px', borderBottom: `1px solid ${md3.outlineVariant}` }}>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
        <Icon name={icon} size={14} color={color} />
        <SectionLabel color={color}>{label}</SectionLabel>
      </Stack>
      <Stack gap={1}>{children}</Stack>
    </Box>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 11, color: md3.outline, lineHeight: 1.35 }}>{desc}</Typography>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </Stack>
  );
}

function Segmented<T extends number | string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (v: T) => void;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant, mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" gap={0.5}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <ButtonBase
              key={String(o.value)}
              onClick={() => onChange(o.value)}
              sx={{
                flex: 1,
                py: 0.625,
                borderRadius: `${radius.sm}px`,
                border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
                bgcolor: active ? md3.primaryContainer : 'transparent',
                color: active ? md3.primary : md3.onSurfaceVariant,
                fontSize: 11,
                fontWeight: 700,
                '&:hover': { bgcolor: active ? md3.primaryContainer : md3.surfaceContainer },
              }}
            >
              {o.label}
            </ButtonBase>
          );
        })}
      </Stack>
    </Box>
  );
}
