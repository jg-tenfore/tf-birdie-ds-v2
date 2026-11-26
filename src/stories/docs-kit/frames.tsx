/**
 * Flat CSS device frames for the docs: a counter terminal and a handheld, each sized by the
 * aspect ratio of the device it stands for, with a real screenshot inside.
 *
 * Deliberately plain. Justin did not want photo-style or generated device mockups in the docs: a
 * screen should read as the screen, in a frame that only says "this is the counter" or "this is in
 * someone's hand". So: one dark bezel, a chin, a stand for the terminal, a camera dot for the
 * handheld, and nothing that tries to look like a photograph.
 *
 * Sizes are proportional. The bezel's padding is a percentage of the frame's width (padding
 * percentages resolve against the containing block, which is the frame's own wrapper), so the same
 * frame reads the same at 120px in a card and at 900px on the Devices page.
 */
import type { CSSProperties } from 'react';

export interface FrameSize {
  width: number;
  height: number;
}

const BEZEL = '#222623';
const STAND = '#2e3330';

const shotStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'top left',
  margin: 0,
};

/**
 * A counter terminal: screen, bezel with a slightly heavier chin, a neck and a base.
 * `size` is the CSS viewport the screenshot was taken at; the screen keeps exactly that ratio.
 */
export function TerminalFrame({
  src,
  alt = '',
  size,
  width = '100%',
  stand = true,
}: {
  src: string;
  alt?: string;
  size: FrameSize;
  /** The frame's width, as CSS. Its height follows from the device's aspect ratio. */
  width?: number | string;
  stand?: boolean;
}) {
  return (
    <div style={{ width, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%' }}>
        <div
          style={{
            background: BEZEL,
            borderRadius: 12,
            padding: '1.6% 1.6% 2.8%',
            boxShadow: '0 1px 2px rgba(25,29,25,.18), 0 10px 24px rgba(25,29,25,.12)',
          }}
        >
          <div style={{ aspectRatio: `${size.width} / ${size.height}`, overflow: 'hidden', borderRadius: 4, background: '#fff' }}>
            <img src={src} alt={alt} loading="lazy" style={shotStyle} />
          </div>
        </div>
      </div>
      {stand && (
        <>
          <div aria-hidden="true" style={{ width: '11%', aspectRatio: '4 / 1', background: STAND }} />
          <div aria-hidden="true" style={{ width: '32%', aspectRatio: '16 / 1', background: STAND, borderRadius: 999 }} />
        </>
      )}
    </div>
  );
}

/**
 * A handheld: a tall rounded bezel with a camera dot, the screen at the device's own ratio.
 * Give `width` in px for the corner radii to scale with it.
 */
export function HandheldFrame({
  src,
  alt = '',
  size,
  width = 180,
}: {
  src: string;
  alt?: string;
  size: FrameSize;
  width?: number;
}) {
  const r = Math.max(14, Math.round(width * 0.13));
  return (
    <div style={{ width, flexShrink: 0 }}>
      <div
        style={{
          position: 'relative',
          background: BEZEL,
          borderRadius: r,
          padding: '9% 4.5% 8%',
          boxShadow: '0 1px 2px rgba(25,29,25,.2), 0 10px 24px rgba(25,29,25,.14)',
        }}
      >
        <span aria-hidden="true" style={{ position: 'absolute', top: '3.4%', left: '50%', width: '4.5%', aspectRatio: '1 / 1', transform: 'translateX(-50%)', borderRadius: 999, background: '#3b413d' }} />
        <div style={{ aspectRatio: `${size.width} / ${size.height}`, overflow: 'hidden', borderRadius: Math.max(6, Math.round(r * 0.45)), background: '#fff' }}>
          <img src={src} alt={alt} loading="lazy" style={shotStyle} />
        </div>
      </div>
    </div>
  );
}
