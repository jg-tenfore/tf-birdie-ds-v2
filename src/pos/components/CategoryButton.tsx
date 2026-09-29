import { ButtonBase } from '@mui/material';
import { elevation, radius } from '../../theme/tokens';
import { Icon } from './primitives';

/**
 * One category button: colour-filled, icon above an all-caps label, outlined when open.
 *
 * Its own component so the V1 → V2 row (`RegisterCategoryRow`) draws exactly the same button
 * rather than a copy of it that drifts.
 */
export function CategoryButton({
  label,
  icon,
  color,
  tc,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  color: string;
  tc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        height: 66,
        borderRadius: `${radius.md}px`,
        bgcolor: color,
        color: tc,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.6px',
        textTransform: 'uppercase',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        textAlign: 'left',
        p: '9px 10px',
        lineHeight: 1.2,
        boxShadow: elevation.e1,
        transition: 'all .13s',
        ...(active
          ? {
              outline: '3px solid rgba(0,0,0,.5)',
              outlineOffset: '-2px',
              filter: 'brightness(.9)',
            }
          : {
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: elevation.e3,
                filter: 'brightness(1.06)',
              },
            }),
      }}
    >
      <Icon name={icon} size={20} />
      {label}
    </ButtonBase>
  );
}
