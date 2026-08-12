import { Box, ButtonBase, Dialog, InputBase, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { md3, radius } from '../../theme/tokens';
import { usePos } from '../state/PosProvider';
import { Icon, SectionLabel } from '../components/primitives';
import { Stack } from '../components/Stack';

/**
 * The shared dialog shell, plus the form controls every dialog is built from.
 *
 * The prototype hand-rolls these because it has no component library; here they're
 * thin wrappers over MUI that pin the POS treatment — 1.5px outlines, 12–13px text,
 * pill options — so twenty dialogs stay consistent without repeating style objects.
 */

export interface ModalFrameProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  width?: number;
  children: ReactNode;
  /** Footer content. Usually `<ModalActions>`. */
  actions?: ReactNode;
  /** Fills the dialog height and scrolls the body — for tabbed or long content. */
  tall?: boolean;
  onClose?: () => void;
}

export function ModalFrame({
  title,
  subtitle,
  icon,
  iconColor = md3.primary,
  width = 480,
  children,
  actions,
  tall,
  onClose,
}: ModalFrameProps) {
  const { dispatch } = usePos();
  const close = onClose ?? (() => dispatch({ type: 'closeModal' }));

  return (
    <Dialog
      open
      onClose={close}
      slotProps={{
        paper: {
          sx: {
            width,
            maxWidth: '92vw',
            ...(tall && { height: 'min(720px, 88vh)' }),
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={1.5}
        sx={{ p: '16px 20px 14px', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
      >
        <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: `${radius.md}px`,
                bgcolor: `${iconColor}1a`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name={icon} size={18} color={iconColor} />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{title}</Typography>
            {subtitle && (
              <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: '2px' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        <ButtonBase
          onClick={close}
          sx={{ p: 0.75, borderRadius: '50%', color: md3.onSurfaceVariant, flexShrink: 0, '&:hover': { bgcolor: md3.surfaceContainer } }}
        >
          <Icon name="close" size={18} />
        </ButtonBase>
      </Stack>

      <Box sx={{ p: '16px 20px', flex: tall ? 1 : 'none', overflowY: 'auto', minHeight: 0 }}>
        {children}
      </Box>

      {actions && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          gap={1}
          sx={{ p: '12px 20px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
        >
          {actions}
        </Stack>
      )}
    </Dialog>
  );
}

// ─── Buttons ────────────────────────────────────────────────────────────────

/** Filled primary action. Dark by default, red when `destructive`. */
export function FilledButton({
  children,
  onClick,
  disabled,
  destructive,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        px: 3,
        py: 1.25,
        borderRadius: `${radius.xl}px`,
        bgcolor: destructive ? md3.error : md3.onSurface,
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        '&:hover': { bgcolor: destructive ? '#8f1414' : '#333' },
        '&.Mui-disabled': { bgcolor: md3.surfaceHighest, color: md3.onSurfaceVariant, opacity: 0.6 },
      }}
    >
      {children}
    </ButtonBase>
  );
}

/** Outlined secondary action. */
export function OutlineButton({
  children,
  onClick,
  destructive,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        px: 2.25,
        py: 1.125,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${destructive ? md3.error : md3.outlineVariant}`,
        color: destructive ? md3.error : md3.onSurfaceVariant,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        '&:hover': { bgcolor: destructive ? '#fff0ee' : md3.surfaceContainer },
        '&.Mui-disabled': { opacity: 0.5 },
      }}
    >
      {children}
    </ButtonBase>
  );
}

// ─── Fields ─────────────────────────────────────────────────────────────────

/** Labelled text/number input. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
  hint,
  prefix,
  disabled,
  multiline,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  hint?: string;
  prefix?: string;
  disabled?: boolean;
  multiline?: boolean;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {label && (
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant, mb: 0.5 }}>
          {label}
        </Typography>
      )}
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.md}px`,
          bgcolor: disabled ? md3.surfaceContainer : '#fff',
          px: 1.25,
          '&:focus-within': { borderColor: md3.primary },
        }}
      >
        {prefix && (
          <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, mr: 0.5 }}>{prefix}</Typography>
        )}
        <InputBase
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          autoFocus={autoFocus}
          disabled={disabled}
          multiline={multiline}
          minRows={multiline ? 3 : undefined}
          sx={{ flex: 1, fontSize: 13, py: 1 }}
        />
      </Stack>
      {hint && (
        <Typography sx={{ fontSize: 10.5, color: md3.outline, mt: 0.5, lineHeight: 1.4 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

/** Labelled native select — used where the option list is long or dynamic. */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (v: T) => void;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {label && (
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant, mb: 0.5 }}>
          {label}
        </Typography>
      )}
      <Box
        component="select"
        value={String(value)}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        sx={{
          width: '100%',
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.md}px`,
          bgcolor: '#fff',
          px: 1.25,
          py: 1.125,
          fontSize: 13,
          fontFamily: 'inherit',
          color: md3.onSurface,
          cursor: 'pointer',
          '&:focus': { outline: 'none', borderColor: md3.primary },
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </Box>
    </Box>
  );
}

/** Pill option group. `multi` allows more than one selection. */
export function PillGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  multi,
}: {
  label?: string;
  value: T[] | T;
  options: Array<{ label: string; value: T; color?: string }>;
  onChange: (v: T) => void;
  multi?: boolean;
}) {
  const selected = Array.isArray(value) ? value : [value];
  return (
    <Box>
      {label && (
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant, mb: 0.75 }}>
          {label}
        </Typography>
      )}
      <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
        {options.map((o) => {
          const active = selected.includes(o.value);
          const accent = o.color ?? md3.primary;
          return (
            <ButtonBase
              key={String(o.value)}
              onClick={() => onChange(o.value)}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: `${radius.xl}px`,
                border: `1.5px solid ${active ? accent : md3.outlineVariant}`,
                bgcolor: active ? `${accent}1f` : '#fff',
                color: active ? accent : md3.onSurfaceVariant,
                fontSize: 12,
                fontWeight: 700,
                '&:hover': { bgcolor: active ? `${accent}2a` : md3.surfaceContainer },
              }}
            >
              {multi && active && <Icon name="check" size={13} sx={{ mr: 0.5 }} />}
              {o.label}
            </ButtonBase>
          );
        })}
      </Stack>
    </Box>
  );
}

/** A labelled group inside a dialog body. */
export function ModalSection({
  title,
  hint,
  children,
  sx,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Box sx={{ mb: 2.25, ...sx }}>
      {title && (
        <Stack direction="row" alignItems="baseline" gap={1} sx={{ mb: 1 }}>
          <SectionLabel color={md3.outline}>{title}</SectionLabel>
          {hint && (
            <Typography sx={{ fontSize: 10.5, color: md3.outline, fontWeight: 400 }}>{hint}</Typography>
          )}
        </Stack>
      )}
      {children}
    </Box>
  );
}

/** A callout: neutral info, amber warning, or red danger. */
export function Callout({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: string;
  children: ReactNode;
}) {
  const tones = {
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: 'info' },
    warning: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', icon: 'warning' },
    danger: { bg: '#ffdad6', border: '#ffb4ab', text: md3.error, icon: 'error' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: 'check_circle' },
  }[tone];

  return (
    <Stack
      direction="row"
      gap={1}
      sx={{
        alignItems: 'flex-start',
        p: '10px 12px',
        bgcolor: tones.bg,
        border: `1px solid ${tones.border}`,
        borderRadius: `${radius.md}px`,
        fontSize: 12,
        color: tones.text,
        lineHeight: 1.45,
      }}
    >
      <Icon name={icon ?? tones.icon} size={15} color={tones.text} sx={{ mt: '1px' }} />
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Stack>
  );
}

/** A search result row — used by every people-lookup dialog. */
export function ResultRow({
  primary,
  secondary,
  badge,
  badgeColor,
  badgeBg,
  selected,
  disabled,
  onClick,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.25}
      onClick={disabled ? undefined : onClick}
      sx={{
        p: '11px 14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        borderBottom: `1px solid ${md3.outlineVariant}`,
        bgcolor: selected ? md3.primaryContainer : '#fff',
        '&:last-of-type': { borderBottom: 'none' },
        '&:hover': { bgcolor: disabled ? '#fff' : md3.primaryContainer },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* `component="div"`: callers pass element content (a member-dot row), and
            Typography's default <p> cannot legally contain a <div>. */}
        <Typography component="div" sx={{ fontSize: 13, fontWeight: 700 }}>
          {primary}
        </Typography>
        {secondary && (
          <Typography
            component="div"
            sx={{ fontSize: 11, color: md3.onSurfaceVariant, mt: '1px' }}
          >
            {secondary}
          </Typography>
        )}
      </Box>
      {badge && (
        <Box
          component="span"
          sx={{
            fontSize: 10,
            fontWeight: 800,
            px: 1,
            py: '3px',
            borderRadius: `${radius.xl}px`,
            bgcolor: badgeBg ?? md3.surfaceContainer,
            color: badgeColor ?? md3.onSurfaceVariant,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {badge}
        </Box>
      )}
      {selected && <Icon name="check" size={17} color={md3.primary} />}
    </Stack>
  );
}

/** Scrollable container for `ResultRow`s. */
export function ResultList({ children, maxHeight = 260 }: { children: ReactNode; maxHeight?: number }) {
  return (
    <Box
      sx={{
        border: `1.5px solid ${md3.outlineVariant}`,
        borderRadius: `${radius.md}px`,
        overflow: 'hidden auto',
        maxHeight,
      }}
    >
      {children}
    </Box>
  );
}
