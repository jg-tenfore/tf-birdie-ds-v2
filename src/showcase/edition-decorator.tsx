import type { Decorator } from '@storybook/react-vite';
import { ARCHIVED_EDITION, CURRENT_EDITION, EditionProvider } from '../pos/edition';
import type { Edition } from '../pos/edition';

/**
 * Which edition a story file renders, stated once in its meta:
 *
 * ```ts
 * const meta = {
 *   title: 'Prototypes/Tablet/Tee Sheet/Reservation panel',
 *   decorators: [withEdition('current-tablet')],
 *   …
 * } satisfies Meta;
 * ```
 *
 * - `current-tablet` / `current-mobile`: `CURRENT_EDITION` for that surface. Everything under
 *   **Prototypes** uses one of these, so the sidebar follows `edition.tsx` when the current Birdie
 *   moves on.
 * - `archived`: `ARCHIVED_EDITION`, the original port. Everything under **Archive**.
 * - A literal edition (`'v1v2'`, `'weston'`, `'base'`): for **Reviews**, which record the edition
 *   that was reviewed rather than whichever is current today.
 *
 * Storybook's own default stays the build's edition (`base`), so a file without this decorator
 * renders the base POS, as it always has.
 *
 * The decorator is an `EditionProvider`. Component stories read it through `useEdition()`, and
 * `Screen` / `MobileStory` pass it on to `PosApp` / `MobileApp` when a story does not name an
 * edition itself. A story that does (`<Screen edition="base" />`, the side-by-side comparisons)
 * still wins. The mobile prototype renders the same story functions without Storybook's
 * decorators, so there they fall through to the build's edition, exactly as before.
 */
export type EditionChoice = Edition | 'current-tablet' | 'current-mobile' | 'archived';

export function resolveEditionChoice(choice: EditionChoice): Edition {
  switch (choice) {
    case 'current-tablet':
      return CURRENT_EDITION.tablet;
    case 'current-mobile':
      return CURRENT_EDITION.mobile;
    case 'archived':
      return ARCHIVED_EDITION;
    default:
      return choice;
  }
}

export function withEdition(choice: EditionChoice): Decorator {
  const edition = resolveEditionChoice(choice);
  const WithEdition: Decorator = (Story) => (
    <EditionProvider edition={edition}>
      <Story />
    </EditionProvider>
  );
  return WithEdition;
}
