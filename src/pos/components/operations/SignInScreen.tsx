import { useEffect, useState } from 'react';
import { keyframes } from '@emotion/react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { demoNow } from '../../data/bookings';
import { APP_IDENTITY } from '../../data/nav';
import { STAFF, staffById } from '../../data/staff';
import { usePos } from '../../state/PosProvider';
import { Icon } from '../primitives';
import { Stack } from '../Stack';

/**
 * PIN sign-in (V1 → V2, Wave 3), over the whole terminal while nobody is signed in — dialogs
 * included, because a dialog left open by the last person is still theirs.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/sign-in.tsx`, from `references/072926/pin.png`: a logo, a text
 * field reading "Enter your PIN", and a SIGN IN button. **Any** four digits worked; the first digit
 * picked one of three operators.
 *
 * ## What was wrong with it
 *
 * A text field on a touch terminal brings up the system keyboard — a full QWERTY sheet for four
 * digits — and the field showed nothing of how many had been typed. Nothing was refused, so a PIN
 * was not really identifying anybody, and the screen said nothing about the terminal it was opening:
 * which facility, whether the last person left an order on the register.
 *
 * ## What this does
 *
 * - **A PIN pad**: four dots, 1–9, Clear, 0, backspace, at 72px a key. The fourth digit submits —
 *   there is no Sign in button to find. The keyboard works too, for a terminal with one.
 * - **Each person has their own PIN**; the store refuses one it does not know and the state is
 *   unchanged. The dots shake, "PIN not recognised" shows, and the pad clears for another go.
 * - **The terminal as it was left**: the facility, the time, who signed out, and what is still open.
 *   An order on the register **stays** for whoever signs in next — a shared terminal hands over
 *   mid-order all the time (a server takes over a tab, the shop covers a break), and throwing the
 *   order away at sign-out would lose a sale. Held orders and the open drawer stay too; this says so.
 * - **Demo PINs**, labelled as such, so a reviewer can get in. A prototype's PINs, not a security model.
 */

const PIN_LENGTH = 4;

const shake = keyframes`
  10%, 90% { transform: translateX(-2px) }
  20%, 80% { transform: translateX(4px) }
  30%, 50%, 70% { transform: translateX(-8px) }
  40%, 60% { transform: translateX(8px) }
`;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

const ROLE_LABEL: Record<string, string> = {
  manager: 'Manager',
  server: 'Server',
  bartender: 'Bartender',
  host: 'Host',
  'pro-shop': 'Pro shop',
};

export function SignInScreen() {
  const { state, dispatch } = usePos();
  const [pin, setPin] = useState('');
  const [attempt, setAttempt] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);

  // The store decides. A refused PIN leaves the state as it was, so when this runs after the
  // attempt's render and nobody is signed in, the PIN was wrong.
  useEffect(() => {
    if (attempt == null) return;
    setAttempt(null);
    setPin('');
    if (!state.signedIn) setRefused(true);
  }, [attempt, state.signedIn]);

  const press = (k: (typeof KEYS)[number]) => {
    if (attempt != null) return;
    setRefused(false);
    if (k === 'clear') return setPin('');
    if (k === 'back') return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      dispatch({ type: 'signIn', pin: next });
      setAttempt(next);
    }
  };

  // A terminal with a keyboard — or a reviewer at a laptop — can type the PIN.
  useEffect(() => {
    if (state.signedIn) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Escape') press('clear');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (state.signedIn) return null;

  const last = staffById(state.operatorId);
  const lines = state.cart.filter((l) => !l.isTax).length;
  const now = demoNow();
  const stillOpen = [
    lines > 0 && `1 order open on the register · ${lines} line${lines === 1 ? '' : 's'}`,
    state.heldOrders.length > 0 && `${state.heldOrders.length} held order${state.heldOrders.length === 1 ? '' : 's'}`,
    state.drawerShift && `Drawer ${state.drawerShift.id} open since ${state.drawerShift.openedAt}`,
  ].filter(Boolean) as string[];

  return (
    <Box
      data-sign-in
      role="dialog"
      aria-modal
      aria-label="Sign in"
      sx={{ position: 'absolute', inset: 0, zIndex: 1400, bgcolor: md3.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff' }}
    >
      {/* ── The terminal ── */}
      <Stack sx={{ width: 360 }} gap={2.5}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
            <Icon name="sports_golf" size={22} color={md3.primaryContainer} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '.12em', color: md3.primaryContainer }}>{APP_IDENTITY.product.toUpperCase()}</Typography>
          </Stack>
          <Typography component="h1" sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }} data-facility>
            {APP_IDENTITY.facility}
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,.66)', mt: 0.75 }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
            {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Typography>
        </Box>

        {(last || stillOpen.length > 0) && (
          <Box data-left-open sx={{ p: '12px 14px', borderRadius: `${radius.md}px`, bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)' }}>
            {last && <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>{last.name} signed out.</Typography>}
            {stillOpen.map((s) => (
              <Stack key={s} direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.75 }}>
                <Icon name="lock_open" size={15} color="rgba(255,255,255,.66)" />
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s}</Typography>
              </Stack>
            ))}
            {stillOpen.length > 0 && (
              <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', mt: 1, lineHeight: 1.45 }}>
                It stays as it was for whoever signs in next.
              </Typography>
            )}
          </Box>
        )}

        <Box data-demo-pins sx={{ p: '12px 14px', borderRadius: `${radius.md}px`, border: '1px dashed rgba(255,255,255,.28)' }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: '#fcd34d', mb: 0.75 }}>DEMO PINS · PROTOTYPE ONLY</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: '3px', columnGap: 2 }}>
            {STAFF.map((s) => (
              <Box key={s.id} sx={{ display: 'contents' }}>
                <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)' }}>
                  {s.name} <Box component="span" sx={{ color: 'rgba(255,255,255,.5)' }}>· {ROLE_LABEL[s.role]}</Box>
                </Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '.1em' }}>{s.pin}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>

      {/* ── The pad ── */}
      <Box sx={{ width: 300 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, textAlign: 'center' }}>Enter your PIN</Typography>
        <Stack
          direction="row"
          justifyContent="center"
          gap={2}
          data-pin-dots={pin.length}
          aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}
          sx={{ my: 2.25, height: 18, animation: refused ? `${shake} .45s ease-in-out` : undefined }}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <Box
              key={i}
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: `2px solid ${refused ? '#ffb4ab' : 'rgba(255,255,255,.7)'}`,
                bgcolor: i < pin.length ? '#fff' : 'transparent',
                transition: 'background-color 100ms linear',
              }}
            />
          ))}
        </Stack>
        <Typography role="alert" data-pin-error sx={{ fontSize: 13, fontWeight: 600, color: '#ffb4ab', textAlign: 'center', height: 20, mb: 1 }}>
          {refused ? 'PIN not recognised. Try again.' : ''}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
          {KEYS.map((k) => (
            <ButtonBase
              key={k}
              data-pin-key={k}
              aria-label={k === 'back' ? 'Delete last digit' : k === 'clear' ? 'Clear' : k}
              onClick={() => press(k)}
              sx={{
                height: 72,
                borderRadius: `${radius.lg}px`,
                bgcolor: k === 'clear' || k === 'back' ? 'transparent' : 'rgba(255,255,255,.1)',
                color: '#fff',
                fontSize: k === 'clear' ? 14 : 26,
                fontWeight: k === 'clear' ? 600 : 500,
                transition: 'background-color 100ms linear',
                '&:hover': { bgcolor: 'rgba(255,255,255,.18)' },
                '&:active': { bgcolor: 'rgba(255,255,255,.26)' },
              }}
            >
              {k === 'back' ? <Icon name="backspace" size={24} /> : k === 'clear' ? 'Clear' : k}
            </ButtonBase>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
