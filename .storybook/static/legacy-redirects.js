// Old Birdie Storybook addresses, and where each one lives now.
//
// On Nov 26, 2026 the sidebar was regrouped (Start Here, Prototypes, Design System, Reviews,
// Archive). Every story file that moved pins its old id in its meta (`id:`), so story links and
// their autodocs pages did not change. MDX pages cannot pin an id, so the docs pages that moved
// are listed here: a link shared before then (Slack, email, the README) still opens the right
// page. Loaded on every page by manager-head.html and preview-head.html; it does nothing unless
// the address asks for one of the ids below. Pattern from TF Crane's own legacy-redirects.js.
(function () {
  var MOVED = {
    // Tee Sheet Actions/0 · Action Map  →  Archive/Tee Sheet Actions/Action map
    "tee-sheet-actions-0-·-action-map--overview": "docs/archive-tee-sheet-actions-action-map--overview",
    // V1 → V2 Migration/Overview  →  Archive/V1 to V2 migration
    "v1-→-v2-migration-overview--overview": "docs/archive-v1-to-v2-migration--overview",
    // V1 → V2 Migration/100126/Overview  →  Reviews/Oct 1 – Proposals from the Sep 30 call/Summary
    "v1-→-v2-migration-100126-overview--overview": "docs/reviews-oct-1-proposals-from-the-sep-30-call-summary--overview",
    // V1 → V2 Migration/100226/Overview  →  Reviews/Oct 2 – Proposal review/Summary
    "v1-→-v2-migration-100226-overview--overview": "docs/reviews-oct-2-proposal-review-summary--overview",
    // Weston Edits/Overview  →  Reviews/Sep 22 – Weston Edits, rounds 1–5/Summary
    "weston-edits-overview--overview": "docs/reviews-sep-22-weston-edits-rounds-1-5-summary--overview",
    // Weston Edits/18 · Rate Catalog  →  Prototypes/Tablet/Tee Sheet/Rate catalog
    "weston-edits-18-·-rate-catalog--overview": "docs/prototypes-tablet-tee-sheet-rate-catalog--overview",
    // Getting Started/Deep Links  →  Start Here/Deep links
    "getting-started-deep-links--overview": "docs/start-here-deep-links--overview",
    // Getting Started/Introduction  →  Start Here/Overview
    "getting-started-introduction--overview": "docs/start-here-overview--overview",
  };
  var url = new URL(window.location.href);
  var path = url.searchParams.get('path');
  var id = path ? path.split('/')[2] : url.searchParams.get('id');
  var to = id && Object.prototype.hasOwnProperty.call(MOVED, id) ? MOVED[id] : null;
  if (!to) return;
  var search = window.location.search;
  if (path) {
    search = search.replace(/([?&]path=)[^&]*/, '$1/' + to);
  } else {
    search = search.replace(/([?&]id=)[^&]*/, '$1' + to.split('/')[1]);
    if (to.indexOf('docs/') === 0) search = search.replace(/([?&]viewMode=)story/, '$1docs');
  }
  // Runs before Storybook reads the address, so it simply opens on the new page.
  window.history.replaceState(null, '', window.location.pathname + search + window.location.hash);
})();
