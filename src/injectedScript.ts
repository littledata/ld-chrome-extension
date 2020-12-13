export function frontendScript() {
	//Get Client ID from Cart data
	// KNOWN BUG: sometimes transactions.littledata.io does not push GA client ID to cart
	// fast enough after page load before we fetch the cart object

	function getCIDFromCart(cartCIDInput) {
		let googleClientID;
		if (cartCIDInput.attributes) {
			googleClientID = cartCIDInput.attributes['google-clientID'];
			if (googleClientID) {
				data.CartClientID = googleClientID;
			} else {
				googleClientID = cartCIDInput.attributes.clientID;
				if (googleClientID) {
					data.CartClientID = googleClientID;
					console.debug('legacy CCID');
				}
			}
			console.debug(
				'LD extension output:',
				JSON.stringify(data, null, 2)
			);
		}
	}

	function getLittlebugPageData() {
		//OUTPUT OBJECT
		const data = {
			href: window.location.href || '',
			Littledata: {
				hasLittledataLayer: false,
				hasTrackingTag: false,
				hasGATrackerJS: false,
				hasSegmentTrackerJS: false,
				hasCarthookTrackerJS: false,
				version: '',
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
			data.Littledata.version = window.LittledataLayer.version;
			data.Littledata.webPropertyID =
				window.LittledataLayer.webPropertyID;

			//What scripts are on this page?
			const scripts = document.getElementsByTagName('script');
			const rgxGA = /www\.google\-analytics\.com\/ga\.js/;
			const rgxUA = /www\.google\-analytics\.com\/analytics\.js/;
			const rgxDC = /stats\.g\.doubleclick\.net\/dc\.js/;
			const rgxGT = /www\.googletagmanager\.com\/gtag\/js/;
			const rgxTM = /www\.googletagmanager\.com\/gtm\.js/;
			const rgxLDC = /.+dist\/carthookTracker\.js/;
			const rgxLDG = /.+dist\/gaTracker\.js/;
			const rgxLDS = /.+dist\/segmentTracker\.js/;

			for (let i = 0, len = scripts.length; i < len; i++) {
				if (rgxGA.test(scripts[i].src)) data.Scripts.classic = true;
				if (rgxUA.test(scripts[i].src)) data.Scripts.universal = true;
				if (rgxDC.test(scripts[i].src)) data.Scripts.doubleclick = true;
				if (rgxGT.test(scripts[i].src)) data.Scripts.gtag = true;
				if (rgxTM.test(scripts[i].src)) data.Scripts.gtm = true;
				if (rgxLDC.test(scripts[i].src)) {
					data.Littledata.hasCarthookTrackerJS = true;
				}
				if (rgxLDG.test(scripts[i].src)) {
					data.Littledata.hasGATrackerJS = true;
				}
				if (rgxLDS.test(scripts[i].src)) {
					data.Littledata.hasSegmentTrackerJS = true;
				}
			}

			// KNOWN BUG: there is a race with GA object and sometimes we don't get tracking ID
			// or client ID in time

			try {
				const rgxTagVersion = /\/[\/\*]\s*Version\s+(v?\d+\.\d+(?:\.\d+){0,2})/gi;
				const rgxTagProperty = /UA\-[0-9]+\-[0-9]+/;

				const ldTagElem = document.querySelector(
					'[name="littledata-tracking-tag"]'
				);
				if (ldTagElem) {
					data.Littledata.hasTrackingTag = true;
					const src = ldTagElem.text;

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
							data.Littledata.webPropertyID = ga
								.getAll()[0]
								.get('trackingId');
						}
					}
				} else {
					console.debug('Could not find LD tag');
				}
			} catch (e) {}

			//Get Client ID from _ga Cookie
			try {
				const Cookie = `; ${document.cookie}`;
				const parts = Cookie.split('; _ga=');
				if (parts.length == 2) {
					const CookieText = parts
						.pop()
						.split(';')
						.shift();
					const CookieValues = CookieText.split('.');
					if (CookieValues.length == 4) {
						data.CookieID = `${CookieValues[2]}.${CookieValues[3]}`;
					}
				}
			} catch (e) {}

			//Get Client ID ga global object
			try {
				data.ClientID = ga.getAll()[0].get('clientId');
			} catch (e) {}

			// Fetch cart.js and then dispatch event for backend

			fetch('/cart.js')
				.then(response => {
					return response.json().then(cartData => {
						if (response.ok) {
							return getCIDFromCart(cartData);
						}
						return Promise.reject({
							status: response.status,
							cartData,
						});
					});
				})
				.then(() => {
					if (data.Littledata.hasLittledataLayer) {
						window.dispatchEvent(
							new CustomEvent('setLittledataPageData', {
								detail: data,
							})
						);
					}
				})
				.catch(error =>
					console.debug('Littlebug fetch error: ', error)
				);

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
}
