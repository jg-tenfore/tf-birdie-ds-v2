/**
 * Start Here › Devices: every profile in `src/pos/devices.ts`, each in a flat frame at its true
 * aspect ratio with a real screenshot taken on it (`scripts/capture-screens.mjs`, `device-<id>`).
 *
 * Frames of one form are drawn at one scale, so they compare like for like: the large display is
 * visibly roomier than the Clover Mini, and the Clover Flex visibly shorter than the Quest.
 */
import { DEVICES, formatSize } from '../../pos/devices';
import type { DeviceProfile } from '../../pos/devices';
import { DOC, DocTable, Eyebrow, Pill, screen } from '../docs-kit/docs-kit';
import { HandheldFrame, TerminalFrame } from '../docs-kit/frames';

const PRIORITY = 'quest-handheld';

const hardware = (d: DeviceProfile) => (d.physical ? `${d.diagonal} · ${formatSize(d.physical)} px` : 'Not hardware: a design canvas');
const viewport = (d: DeviceProfile) => `${formatSize(d.viewport)}${d.pixelRatio !== 1 ? ` @${d.pixelRatio}×` : ''}`;

/** One device: its frame, then its name, size and note. */
const DeviceFigure = ({ d }: { d: DeviceProfile }) => (
  <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {d.form === 'tablet' ? (
        <TerminalFrame src={screen(`device-${d.id}`)} alt={`${d.label}: a reservation over the tee sheet`} size={d.viewport} width="100%" />
      ) : (
        <div style={{ width: '100%' }}>
          <HandheldFrame src={screen(`device-${d.id}`)} alt={`${d.label}: the tee sheet`} size={d.viewport} width={d.viewport.width * 0.62} />
        </div>
      )}
    </div>
    <figcaption style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Eyebrow color={d.group === 'canvas' ? DOC.muted : DOC.brandText}>{d.group === 'canvas' ? 'Design canvas' : d.form === 'tablet' ? 'Counter terminal' : 'Handheld'}</Eyebrow>
        {d.id === PRIORITY && <Pill tone="brand">Priority</Pill>}
      </span>
      <strong style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600, color: DOC.ink }}>{d.label}</strong>
      <span style={{ fontSize: 13.5, lineHeight: '20px', color: DOC.ink }}>
        {viewport(d)} · {d.aspect}
      </span>
      <span style={{ fontSize: 13.5, lineHeight: '20px' }}>{d.note}</span>
    </figcaption>
  </figure>
);

/**
 * The devices of one form side by side. Columns are sized in `fr` by each device's CSS width, so the
 * frames keep their sizes relative to each other: the large display is half again as wide as the
 * Clover Mini, the Clover Flex 80px shorter than the Quest.
 */
export const DeviceRow = ({ form }: { form: 'tablet' | 'handheld' }) => {
  const list = DEVICES.filter((d) => d.form === form);
  return (
    <div
      style={{
        display: 'grid',
        gap: 24,
        gridTemplateColumns: form === 'tablet' ? list.map((d) => `${d.viewport.width}fr`).join(' ') : `repeat(${list.length}, max-content)`,
        justifyContent: form === 'tablet' ? undefined : 'center',
        alignItems: 'stretch',
        borderRadius: 20,
        background: DOC.container,
        padding: '28px 24px 22px',
      }}
    >
      {list.map((d) => (
        <div key={d.id} style={{ display: 'flex', minWidth: 0, maxWidth: form === 'tablet' ? undefined : 260 }}>
          <DeviceFigure d={d} />
        </div>
      ))}
    </div>
  );
};

/** All six at a glance. */
export const DeviceTable = () => (
  <DocTable
    columns={['Device', 'Runs', 'Hardware', 'Simulated viewport', 'Aspect']}
    widths={['30%', '16%', '22%', '18%', '14%']}
    rows={DEVICES.map((d) => [
      <strong key="n" style={{ fontWeight: 600 }}>{d.label}</strong>,
      d.form === 'tablet' ? 'The tablet app' : 'The phone app',
      hardware(d),
      viewport(d),
      d.aspect,
    ])}
  />
);

export const deviceCount = (group?: DeviceProfile['group']) => DEVICES.filter((d) => !group || d.group === group).length;
