export interface WikidataResponse {
  entities?: Record<
    string,
    {
      claims?: {
        P18?: {
          rank?: string;
          mainsnak?: { datavalue?: { value?: unknown } };
        }[];
      };
    }
  >;
}

export interface WikimediaImageResponse {
  query?: {
    pages?: {
      thumbnail?: { source?: string };
      imageinfo?: { thumburl?: string; url?: string }[];
    }[];
  };
}
