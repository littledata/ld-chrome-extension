interface LDWindow extends Window {
    LittledataLayer: any;
}

interface FrontendData {
    href: string;
    Littledata: {
        hasLittledataLayer: boolean;
        hasTrackingTag: boolean;
        hasGATrackerJS: boolean;
        hasSegmentTrackerJS: boolean;
        hasCarthookTrackerJS: boolean;
        version: string;
        webPropertyID: string
    };
    CookieID: string;
    ClientID: string;
    CartClientID: string;
    Scripts: {
        classic: boolean;
        universal: boolean;
        doubleclick: boolean;
        gtag: boolean;
        gtm: boolean
    };
}

interface ShopifyCart {
    attributes: {
        'google-clientID': string;
        littledata_updatedAt: string;
        clientID: string;
    };
    token: string;
}