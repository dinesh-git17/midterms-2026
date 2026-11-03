import { partyShort } from "./colors";
import { fmt, type Race, type StateResult } from "./model";

// civicAPI can report 0% expected vote while early ballots are already counted.
const counted = (r: Race) => (r.reporting > 0 ? `${fmt.reporting(r.reporting)} in` : "early count");

const lastName = (name: string) => name.split(" ").filter((w) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(w)).at(-1) ?? name;

/** One plain line for a race: "Ossoff (D) leads by 2.1 pts, 34% in". */
export function raceLine(r: Race): string {
  const [a] = r.candidates;
  if (!a) return "No candidates listed";
  const who = `${lastName(a.name)} (${partyShort[a.party][0]})`;
  switch (r.status) {
    case "called":
      return `${lastName(r.candidates.find((c) => c.winner)?.name ?? a.name)} (${partyShort[r.party!][0]}) wins`;
    case "runoff":
      return "Headed to a runoff";
    case "waiting":
      return "No votes counted yet";
    case "tied":
      return `Tied, ${counted(r)}`;
    default:
      return `${who} leads by ${r.margin.toFixed(1)} pts, ${counted(r)}`;
  }
}

export function stateLine(s: StateResult): string {
  if (s.seats) {
    const { called, leading, total } = s.seats;
    const parts = [
      called.D && `${called.D} D won`,
      called.R && `${called.R} R won`,
      called.O && `${called.O} other won`,
      leading.D && `${leading.D} D ahead`,
      leading.R && `${leading.R} R ahead`,
    ].filter(Boolean);
    return parts.length ? `${parts.join(", ")} of ${total}` : `${total} ${total === 1 ? "seat" : "seats"}, no votes counted yet`;
  }
  return raceLine(s.races[0]);
}
