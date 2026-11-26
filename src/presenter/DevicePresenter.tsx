import { Box, ButtonBase, FormControlLabel, IconButton, Switch, Tooltip, Typography } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { elevation, fontFamily, md3, radius } from '../theme/tokens';
import { Stack } from '../pos/components/Stack';
import { device, formatSize, groupedDevices, isDeviceId } from '../pos/devices';
import type { DeviceForm, DeviceId } from '../pos/devices';
import { STORAGE_KEYS } from './device-choice';

/**
 * The presenter's device panel — a small floating card over either prototype.
 *
 * It belongs to whoever is *showing* the prototype, not to the POS: it floats over the page in
 * the corner, outside the device frame, and `?presenter=0` removes it for a clean screenshot.
 * Collapsed (the default) it is one pill naming the device; open, it has the device dropdown,
 * **Fit to window**, and a readout of what is being simulated.
 *
 * The dropdown is a native `<select>` with `<optgroup>`s on purpose: it portals nowhere, so it
 * keeps working while one of the app's own dialogs (and its focus trap) is open.
 */

const PANEL_W = 300;

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.open) === '1';
  } catch {
    return false;
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={1.5} sx={{ fontSize: 12, lineHeight: '18px' }}>
      <Box component="span" sx={{ color: md3.onSurfaceVariant }}>
        {label}
      </Box>
      <Box component="span" sx={{ color: md3.onSurface, fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Box>
    </Stack>
  );
}

export function DevicePresenter({
  form,
  deviceId,
  onChange,
  onSwitchApp,
  fit,
  onFit,
  scale,
}: {
  /** The app this panel sits over. A device of the other form switches apps. */
  form: DeviceForm;
  deviceId: DeviceId;
  /** A device of this app's own form. */
  onChange: (id: DeviceId) => void;
  /** A device of the other form: navigate to the other app on it. */
  onSwitchApp: (id: DeviceId) => void;
  fit: boolean;
  onFit: (fit: boolean) => void;
  /** The scale the frame is drawn at right now (1 = 1:1). */
  scale: number;
}) {
  const [open, setOpen] = useState(readOpen);
  const profile = device(deviceId);
  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(STORAGE_KEYS.open, v ? '0' : '1');
      } catch {
        // Private windows can refuse storage; the panel still works for this visit.
      }
      return !v;
    });
  };

  const pick = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!isDeviceId(id) || id === deviceId) return;
    if (device(id).form === form) onChange(id);
    else onSwitchApp(id);
  };

  const pct = Math.round(scale * 100);
  const shown =
    scale < 0.999 ? `${pct}% — scaled to fit` : fit ? '100% — 1:1' : '100% — 1:1, scroll for the rest';

  return (
    <Box
      data-device-presenter
      role="region"
      aria-label="Device"
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 2100,
        fontFamily,
        color: md3.onSurface,
      }}
    >
      {!open ? (
        <Tooltip title="Choose a device" placement="left">
          <ButtonBase
            onClick={toggle}
            aria-expanded={false}
            aria-label={`Device: ${profile.label}. Open the device panel`}
            sx={{
              height: 36,
              px: 1.75,
              gap: 1,
              borderRadius: `${radius.xl}px`,
              bgcolor: 'rgba(255,255,255,.94)',
              border: `1px solid ${md3.outlineVariant}`,
              boxShadow: elevation.e3,
              fontSize: 13,
              fontWeight: 600,
              fontFamily,
              color: md3.onSurface,
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            <Box component="span" sx={{ color: md3.primary, fontWeight: 800 }}>
              {profile.shortLabel}
            </Box>
            <Box component="span" sx={{ color: md3.onSurfaceVariant, fontWeight: 500 }}>
              {formatSize(profile.viewport)} · {profile.aspect}
              {scale < 0.999 ? ` · ${pct}%` : ''}
            </Box>
            <ExpandLess sx={{ fontSize: 18, color: md3.onSurfaceVariant }} />
          </ButtonBase>
        </Tooltip>
      ) : (
        <Box
          sx={{
            width: PANEL_W,
            bgcolor: '#fff',
            borderRadius: `${radius.lg}px`,
            border: `1px solid ${md3.outlineVariant}`,
            boxShadow: elevation.e3,
            p: 1.75,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '.02em' }}>Device</Typography>
            <IconButton size="small" aria-label="Collapse the device panel" aria-expanded onClick={toggle}>
              <ExpandMore sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>

          <Box
            component="select"
            aria-label="Device"
            value={deviceId}
            onChange={pick}
            sx={{
              height: 36,
              px: 1,
              borderRadius: `${radius.sm}px`,
              border: `1.5px solid ${md3.outline}`,
              bgcolor: '#fff',
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              color: md3.onSurface,
              cursor: 'pointer',
              '&:focus-visible': { outline: `2px solid ${md3.primary}`, outlineOffset: 1 },
            }}
          >
            {groupedDevices().map((g) => (
              <optgroup key={g.group} label={g.label}>
                {g.devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                    {d.form !== form ? (d.form === 'handheld' ? ' — phone app' : ' — tablet app') : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Row
              label="Hardware"
              value={
                profile.physical
                  ? `${profile.diagonal} · ${formatSize(profile.physical)} px`
                  : 'Design canvas — not hardware'
              }
            />
            <Row label="Aspect ratio" value={profile.aspect} />
            <Row
              label="Simulated viewport"
              value={`${formatSize(profile.viewport)}${profile.pixelRatio > 1 ? ` @${profile.pixelRatio}×` : ''}`}
            />
            <Row label="Shown at" value={shown} />
          </Box>

          <Typography sx={{ fontSize: 11.5, lineHeight: 1.45, color: md3.onSurfaceVariant }}>{profile.note}</Typography>

          <FormControlLabel
            control={<Switch size="small" checked={fit} onChange={(e) => onFit(e.target.checked)} />}
            label="Fit to window"
            sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 13, fontWeight: 600 } }}
          />
          <Typography sx={{ fontSize: 11, color: md3.outline, mt: -0.75 }}>
            Scales the device down when the window is smaller — never up. Add <code>?presenter=0</code> to
            hide this panel.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
