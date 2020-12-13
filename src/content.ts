/****************************
 * CONTENT SCRIPT INJECTION *
 ****************************/

/*
  Note: This script will run BEFORE content.idle.js and exists because we do not
  have access to a page's JS variables directly from a content script, so we have
  to inject some code onto the active tab's page and do all the gathering work here.
  Values defined or populated via this script are available for content.idle.js to read and edit, though.
 */

import {
	initActiveState,
	initDisabledState,
	initPageDataContentListener,
	// eslint-disable-next-line import/no-unresolved
} from './helpers';
// eslint-disable-next-line import/no-unresolved
import { frontendScript } from './injectedScript';

chrome.storage.local.get('state', function(result) {
	if (result.state === null) {
		initDisabledState();
	} else if (result.state === false) {
		initDisabledState();
	}
	if (result.state === true) {
		initActiveState();
		injectContentScriptJS();
		initPageDataContentListener();
	}
});

function injectContentScriptJS() {
	const injectCode = `(${frontendScript})();`;

	const script = document.createElement('script');
	script.textContent = injectCode;
	document.documentElement.appendChild(script);
	script.parentNode.removeChild(script);
}
