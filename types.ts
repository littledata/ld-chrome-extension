export interface CustomWindow extends Window {
	console: { (...data: any[]): void; (message?: any, ...optionalParams: any[]): void };
	ga: any;
	LittledataLayer: OwnLayer;
	dataLayer: any[];
	LittledataScriptVersion: string;
}

export interface OwnLayer {
	version?: string;
	writeKey?: string;
	webPropertyID?: string; // spelling prior to LittledataLayer v9.0.1
	webPropertyId?: string;
	measurementId?: string;
	FacebookPixelID?: string;
}

export interface IData {
	href: string;
	Littledata: {
		hasLittledataLayer: boolean;
		hasTrackingTag: boolean;
		hasGATrackerJS: boolean;
		hasSegmentTrackerJS: boolean;
		hasCarthookTrackerJS: boolean;
		hasLDBundle: boolean;
		version: string;
		scriptVersion: string;
		webPropertyID: string;
	};
	CookieID: string;
	ClientID: string;
	CartClientID: string;
	Scripts: {
		classic: boolean;
		universal: boolean;
		doubleclick: boolean;
		gtag: boolean;
		gtm: boolean;
	};
}
