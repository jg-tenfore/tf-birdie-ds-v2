import { md3 } from '../../theme/tokens';
import { NAV_GROUPS, isLive } from '../../pos/data/nav';
import { MIGRATION } from './migration';

/**
 * The V1 → V2 coverage table, generated.
 *
 * Status is read from `isLive(item, 'v1v2')` — the same flag that decides whether the nav tile
 * opens — so this page and the prototype cannot disagree about what has been migrated. The
 * rows follow the nav's own grouping and order, which is also the build order.
 *
 * Plain elements and inline styles, because MDX docs render outside the MUI theme.
 */
export function CoverageTable() {
  const rows = NAV_GROUPS.flatMap((g) =>
    g.items.map((item) => ({ item, group: g.heading ?? '—', row: MIGRATION.find((m) => m.key === item.key) })),
  );
  const done = rows.filter((r) => isLive(r.item, 'v1v2')).length;

  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 10px',
    fontSize: 12,
    color: md3.onSurfaceVariant,
    borderBottom: `1px solid ${md3.outlineVariant}`,
    fontWeight: 700,
  };
  const td: React.CSSProperties = {
    padding: '9px 10px',
    fontSize: 13.5,
    lineHeight: 1.45,
    verticalAlign: 'top',
    borderBottom: `1px solid ${md3.outlineVariant}`,
  };

  return (
    <div data-coverage-table>
      <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>
        {done} of {rows.length} destinations live in V1 → V2
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Destination</th>
            <th style={th}>What it is for</th>
            <th style={th}>Wave</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, group, row }) => {
            const live = isLive(item, 'v1v2');
            return (
              <tr key={item.key} data-coverage-row={item.key}>
                <td style={td}>
                  <strong>{item.label}</strong>
                  <div style={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{group}</div>
                </td>
                <td style={td}>
                  {row?.v1}
                  {row?.leftBehind && (
                    <div style={{ fontSize: 12, color: md3.onSurfaceVariant, marginTop: 3 }}>
                      <em>Left behind:</em> {row.leftBehind}
                    </div>
                  )}
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{row ? row.wave : '—'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }} data-coverage-status={live ? 'live' : 'pending'}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '.04em',
                      background: live ? '#dcfce7' : '#f3f4f6',
                      color: live ? '#16a34a' : '#707973',
                    }}
                  >
                    {live ? 'LIVE' : 'NOT YET'}
                  </span>
                  {row?.inherited && (
                    <div style={{ fontSize: 11.5, color: md3.onSurfaceVariant, marginTop: 4, whiteSpace: 'normal' }}>
                      {row.inherited}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
