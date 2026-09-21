import { Fab } from '@mui/material';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import { md3 } from '../../../../theme/tokens';
import { useGolferRoster } from '../../../state/PosProvider';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { GolferList, GolferSearchHeader } from './parts';
import { useGolferSearch } from './people-utils';

/**
 * People — the CRM as a destination.
 *
 * The contacts-app shape: search at the top, filter chips under it, an alphabetical list
 * sectioned by surname. Tapping a person drills in (`golferDetail`, a push); creating one
 * is a full-screen dialog from the extended FAB, because it's a form you can abandon.
 */
export function PeopleScreen(_: ScreenProps<'people'>) {
  const nav = useMobileNav();
  const search = useGolferSearch();
  const roster = useGolferRoster();
  const members = roster.filter((g) => g.memberType).length;

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title="People"
          subtitle={`${roster.length} customers · ${members} members`}
          leading="none"
        >
          <GolferSearchHeader search={search} />
        </TopAppBar>
      }
      fab={
        <Fab
          variant="extended"
          onClick={() => nav.push({ name: 'newCustomer' })}
          sx={{
            bgcolor: md3.primaryContainer,
            color: md3.onPrimaryContainer,
            height: 56,
            px: 2.5,
            gap: 1.5,
            textTransform: 'none',
            fontSize: 14,
            fontWeight: 500,
            '&:hover': { bgcolor: md3.primaryContainer },
          }}
        >
          <PersonAddOutlined />
          New customer
        </Fab>
      }
    >
      <GolferList
        golfers={search.results}
        onPick={(g) => nav.push({ name: 'golferDetail', golferId: g.id })}
      />
    </MobileScreen>
  );
}
