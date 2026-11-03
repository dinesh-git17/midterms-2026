export type Chamber = "senate" | "house" | "governor";

/** civicAPI summary races for November 3, 2026. Each lists every state's (or district's) race. */
export const SUMMARY_IDS: Record<Chamber, number> = {
  senate: 87528,
  house: 87524,
  governor: 87535,
};

export const POLL_MS = 30_000;

/**
 * Seats not on the ballot this year. Senate: 53 R and 47 D (45 D plus King and Sanders,
 * who caucus with Democrats) going in, with 22 R and 13 D seats up across 35 races
 * (33 regular plus the Florida and Ohio specials). Governors: 14 states not voting.
 * Sources are in docs/WORK_LEDGER.md.
 */
export const HOLDOVERS: Record<Chamber, { D: number; R: number }> = {
  senate: { D: 34, R: 31 },
  house: { D: 0, R: 0 },
  governor: { D: 6, R: 8 },
};

export const CHAMBERS: Record<Chamber, { label: string; short: string; total: number; majority: number; unit: string }> = {
  senate: { label: "Senate", short: "Senate", total: 100, majority: 51, unit: "seats" },
  house: { label: "House", short: "House", total: 435, majority: 218, unit: "seats" },
  governor: { label: "Governors", short: "Governors", total: 50, majority: 26, unit: "governors" },
};

/**
 * Races to watch, from the Cook Political Report and NPR's race tiers published
 * October 30, 2026 (toss-ups and the most likely flips). Listed in docs/WORK_LEDGER.md.
 */
export const KEY_RACES: { chamber: Chamber; state: string }[] = [
  { chamber: "senate", state: "nc" },
  { chamber: "senate", state: "mi" },
  { chamber: "senate", state: "oh" },
  { chamber: "senate", state: "me" },
  { chamber: "senate", state: "ga" },
  { chamber: "senate", state: "tx" },
  { chamber: "senate", state: "ia" },
  { chamber: "senate", state: "ak" },
  { chamber: "senate", state: "ks" },
  { chamber: "governor", state: "mi" },
  { chamber: "governor", state: "wi" },
  { chamber: "governor", state: "az" },
  { chamber: "governor", state: "ga" },
  { chamber: "governor", state: "nv" },
];

export const STATES: Record<string, { name: string; fips: string }> = {
  al: { name: "Alabama", fips: "01" }, ak: { name: "Alaska", fips: "02" }, az: { name: "Arizona", fips: "04" },
  ar: { name: "Arkansas", fips: "05" }, ca: { name: "California", fips: "06" }, co: { name: "Colorado", fips: "08" },
  ct: { name: "Connecticut", fips: "09" }, de: { name: "Delaware", fips: "10" }, dc: { name: "District of Columbia", fips: "11" },
  fl: { name: "Florida", fips: "12" }, ga: { name: "Georgia", fips: "13" }, hi: { name: "Hawaii", fips: "15" },
  id: { name: "Idaho", fips: "16" }, il: { name: "Illinois", fips: "17" }, in: { name: "Indiana", fips: "18" },
  ia: { name: "Iowa", fips: "19" }, ks: { name: "Kansas", fips: "20" }, ky: { name: "Kentucky", fips: "21" },
  la: { name: "Louisiana", fips: "22" }, me: { name: "Maine", fips: "23" }, md: { name: "Maryland", fips: "24" },
  ma: { name: "Massachusetts", fips: "25" }, mi: { name: "Michigan", fips: "26" }, mn: { name: "Minnesota", fips: "27" },
  ms: { name: "Mississippi", fips: "28" }, mo: { name: "Missouri", fips: "29" }, mt: { name: "Montana", fips: "30" },
  ne: { name: "Nebraska", fips: "31" }, nv: { name: "Nevada", fips: "32" }, nh: { name: "New Hampshire", fips: "33" },
  nj: { name: "New Jersey", fips: "34" }, nm: { name: "New Mexico", fips: "35" }, ny: { name: "New York", fips: "36" },
  nc: { name: "North Carolina", fips: "37" }, nd: { name: "North Dakota", fips: "38" }, oh: { name: "Ohio", fips: "39" },
  ok: { name: "Oklahoma", fips: "40" }, or: { name: "Oregon", fips: "41" }, pa: { name: "Pennsylvania", fips: "42" },
  ri: { name: "Rhode Island", fips: "44" }, sc: { name: "South Carolina", fips: "45" }, sd: { name: "South Dakota", fips: "46" },
  tn: { name: "Tennessee", fips: "47" }, tx: { name: "Texas", fips: "48" }, ut: { name: "Utah", fips: "49" },
  vt: { name: "Vermont", fips: "50" }, va: { name: "Virginia", fips: "51" }, wa: { name: "Washington", fips: "53" },
  wv: { name: "West Virginia", fips: "54" }, wi: { name: "Wisconsin", fips: "55" }, wy: { name: "Wyoming", fips: "56" },
};

export const FIPS_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATES).map(([code, s]) => [s.fips, code]),
);
