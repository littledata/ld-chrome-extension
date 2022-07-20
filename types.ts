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
		version: string;
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

interface CustomEventMap {
	setLittledataPageData: CustomEvent<IData>;
}

declare global {
	interface Document {
		//adds definition to Document, but you can do the same with HTMLElement
		addEventListener<K extends keyof CustomEventMap>(
			type: K,
			listener: (this: Document, ev: CustomEventMap[K]) => void,
		): void;
	}
}
