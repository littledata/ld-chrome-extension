import { CustomWindow, IData } from '../types';

declare let window: CustomWindow;

/****************************
 * CONTENT SCRIPT INJECTION *
 ****************************/

/*
  Note: This script will run BEFORE content.idle.js and exists because we do not
  have access to a page's JS variables directly from a content script, so we have
  to inject some code onto the active tab's page and do all the gathering work here.
  Values defined or populated via this script are available for content.idle.js to read and edit, though.
 */

chrome.storage.local.get('state', (result) => {
	if (result.state === null || result.state === false) {
		initDisabledState();
	}
	if (result.state === true) {
		initActiveState();
		injectContentScriptJS();
		initPageDataContentListener();
	}
});

//Page render with extension active state == false
const initDisabledState = () => {
	chrome.runtime.sendMessage({
		from: 'content',
		subject: 'changeExtensionIcon',
		mode: false,
	});
};

//Page render with extension active state == true
const initActiveState = () => {
	chrome.runtime.sendMessage({
		from: 'content',
		subject: 'changeExtensionIcon',
		mode: true,
	});
};

//injecting code that does the checks in the client window
const injectContentScriptJS = () => {
	const injectCode =
		'(' +
		function () {
			function getLittlebugPageData() {
				const data: IData = {
					href: window.location.href || '',
					Littledata: {
						hasLittledataLayer: false,
						hasTrackingTag: false,
						hasGATrackerJS: false,
						hasSegmentTrackerJS: false,
						hasCarthookTrackerJS: false,
						hasLDBundle: false,
						version: '',
						scriptVersion: '',
						webPropertyID: '',
					},
					CookieID: '',
					ClientID: '',
					CartClientID: '',
					Scripts: {
						classic: false,
						universal: false,
						doubleclick: false,
						gtag: false,
						gtm: false,
					},
				};

				//What version of LD script is running and to what property?
				if (window.LittledataLayer) {
					data.Littledata.hasLittledataLayer = true;
					if (window.LittledataLayer.version) data.Littledata.version = window.LittledataLayer.version;
					if (window.LittledataLayer.webPropertyID) {
						data.Littledata.webPropertyID = window.LittledataLayer.webPropertyID;
					} else if (window.LittledataLayer.webPropertyId) {
						data.Littledata.webPropertyID = window.LittledataLayer.webPropertyId;
					}
					if (window.LittledataScriptVersion) data.Littledata.scriptVersion = window.LittledataScriptVersion;

					//What scripts are on this page?
					const scripts = document.getElementsByTagName('script');
					const rgxGA = /www\.google\-analytics\.com\/ga\.js/;
					const rgxUA = /www\.google\-analytics\.com\/analytics\.js/;
					const rgxDC = /stats\.g\.doubleclick\.net\/dc\.js/;
					const rgxGT = /www\.googletagmanager\.com\/gtag\/js/;
					const rgxTM = /www\.googletagmanager\.com\/gtm\.js/;
					const rgxLDC = /.+\/carthookTracker\.js/;
					const rgxLDG = /.+\/colibrius-g\.js/;
					const rgxLDS = /.+\/colibrius-s\.js/;
					const rgxLDB = /.+\/colibrius\.js/;

					for (let i = 0, len = scripts.length; i < len; i++) {
						if (rgxGA.test(scripts[i].src)) data.Scripts.classic = true;
						if (rgxUA.test(scripts[i].src)) data.Scripts.universal = true;
						if (rgxDC.test(scripts[i].src)) data.Scripts.doubleclick = true;
						if (rgxGT.test(scripts[i].src)) data.Scripts.gtag = true;
						if (rgxTM.test(scripts[i].src)) data.Scripts.gtm = true;
						if (rgxLDC.test(scripts[i].src)) data.Littledata.hasCarthookTrackerJS = true;
						if (rgxLDG.test(scripts[i].src)) data.Littledata.hasGATrackerJS = true;
						if (rgxLDS.test(scripts[i].src)) data.Littledata.hasSegmentTrackerJS = true;
						if (rgxLDB.test(scripts[i].src)) data.Littledata.hasLDBundle = true;
					}

					// KNOWN BUG: there is a race with GA object and sometimes we don't get tracking ID
					// or client ID in time

					try {
						const rgxTagVersion = /\/[\/\*]\s*Version\s+(v?\d+\.\d+(?:\.\d+){0,2})/gi;
						const rgxTagProperty = /UA\-\d+\-\d+/; // example: UA-123-1

						const ldTagElem = document.querySelector('[name="littledata-tracking-tag"]');

						if (ldTagElem) {
							data.Littledata.hasTrackingTag = true;
							const src = ldTagElem.textContent;

							if (!src) return;

							if (data.Littledata.version === '') {
								//Get version number
								const v = rgxTagVersion.exec(src);

								if (v && v[1]) data.Littledata.version = v[1];
							}

							if (data.Littledata.webPropertyID == undefined) {
								//Get web property ID
								const p = rgxTagProperty.exec(src);

								if (p) {
									data.Littledata.webPropertyID = p[0];
								} else {
									data.Littledata.webPropertyID = window.ga.getAll()[0].get('trackingId');
								}
							}
						} else {
							console.debug('Could not find LD tag');
						}
					} catch (e) {}

					//Get Client ID from _ga Cookie
					try {
						const Cookie = '; ' + document.cookie;
						const parts = Cookie.split('; _ga=');

						if (parts.length == 2) {
							const CookieText = parts.pop()?.split(';').shift();
							const CookieValues = CookieText?.split('.');

							if (CookieValues?.length == 4) data.CookieID = CookieValues[2] + '.' + CookieValues[3];
						}
					} catch (e) {}

					//Get Client ID ga global object
					try {
						data.ClientID = window.ga.getAll()[0].get('clientId');
					} catch (e) {}

					//Get Client ID from Cart data
					// KNOWN BUG: sometimes transactions.littledata.io does not push GA client ID to cart
					// fast enough after page load before we fetch the cart object

					const getCIDFromCart = (cartCIDInput: Record<string, any>) => {
						let googleClientID;

						if (cartCIDInput.attributes) {
							googleClientID = cartCIDInput.attributes['google-clientID'];
							if (googleClientID) {
								data.CartClientID = googleClientID;
							} else {
								googleClientID = cartCIDInput.attributes['clientID'];
								if (googleClientID) {
									data.CartClientID = googleClientID;
									console.debug('legacy CCID');
								}
							}
							console.debug('LD extension output:', JSON.stringify(data, null, 2));
						}
					};

					// Fetch cart.js and then dispatch event for backend

					fetch('/cart.js')
						.then(async (response) => {
							const cartData = await response.json();

							if (response.ok) {
								return getCIDFromCart(cartData);
							} else {
								return Promise.reject({
									status: response.status,
									cartData,
								});
							}
						})
						.then(() => {
							if (data.Littledata.hasLittledataLayer) {
								window.dispatchEvent(
									new CustomEvent<IData>('setLittledataPageData', {
										detail: data,
									}),
								);
							}
						})
						.catch((error) => console.debug('Littlebug fetch error: ', error));

					return data;
				}
			}

			window.addEventListener('load', () => {
				getLittlebugPageData();
			});

			// setting an internal visitor filter for GA
			if (window.location.hostname.indexOf('littledata.io') > -1) {
				window.localStorage.setItem('LD internal', 'yes');
			}
		} +
		')();';

	const script = document.createElement('script');

	script.textContent = injectCode;
	document.documentElement.appendChild(script);
	script.parentNode?.removeChild(script);
};

const initPageDataContentListener = () => {
	let pageLog: Record<string, any>[] = [];

	chrome.storage.local.get('pageLog', (result) => {
		if (result.pageLog) pageLog = JSON.parse(result.pageLog);
	});

	window.addEventListener('setLittledataPageData', ((evt: CustomEvent<IData>) => {
		pageLog.push(evt.detail); //add current page's data to the log
		chrome.runtime.sendMessage({
			from: 'content',
			subject: 'savePageLogData',
			data: JSON.stringify(pageLog),
		});
	}) as EventListener);
};
