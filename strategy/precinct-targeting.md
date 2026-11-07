# Precinct Targeting: Persuade, Turn Out, or Skip

You can't knock every door or mail every house. Targeting decides where your limited time and money go. The workbook's `Precincts` tab (and `tools/targeting.py`) sorts each precinct automatically using two numbers.

## The two numbers

**Support** — the share of votes your "baseline" side got in past comparable elections in that precinct.
- In a partisan race, use comparable past candidates from your party.
- In a nonpartisan race, pick the past race or ballot measure that best resembles your likely coalition, and use the share for that side. Write down why. Re-check this choice with a few local people who know the district.

**Turnout** — ballots cast ÷ registered voters, averaged across comparable elections.

## The rules (defaults; all editable in the workbook)

| Support | Turnout | Category | Why |
|---|---|---|---|
| ≥ 55% | Below district average | **Turn Out** | People here already lean your way. Your job is making sure they actually vote. |
| ≥ 55% | At/above district average | **Base — Light Touch** | Supportive and already voting. A mail piece and a final reminder. Don't spend scarce door time here. |
| 45–55% | Any | **Persuade** | Close precincts where conversations change outcomes. Door-knocking priority. |
| < 45% | Any | **Skip** | Low return per hour. Exception: individual voters you've identified as supporters. |

**Ranking within a category:** precincts are ranked by **votes available** — roughly, how many votes a contact program there can realistically move.

- *Persuade:* projected voters × how close support is to 50% (closer means more persuadable).
- *Turn Out:* supportive registered voters who usually *don't* vote (registered × support × (1 − turnout)).

## Judgment the math can't make

- **Small samples.** In a tiny precinct, a handful of votes swings the percentages. Don't over-read precincts with under ~200 voters.
- **Changing neighborhoods.** New housing, a closed plant, or a redistricting change can make old results misleading. Note it and override.
- **Your personal base.** A precinct where you live, coach, or worship may perform better for you than the baseline suggests.
- **Language needs.** A Turn Out or Persuade precinct with a large share of non-English-dominant households needs translated materials and bilingual volunteers (Step 2).
- **Equity of attention.** Low-turnout precincts are often low-turnout because campaigns skip them. If your coalition includes neighbors who haven't been asked, sometimes the effort is worth it beyond the math. Make that a deliberate choice.

## Using a voter file

Precinct targeting is a starting point. If you have a voter file with vote history, go one level deeper: in Persuade precincts, contact frequent voters; in Turn Out precincts, contact likely supporters who vote inconsistently. ⚖️ Permitted uses of the voter file vary by state.

## The data format

Both the workbook and `tools/targeting.py` take one row per precinct with, for each past election:

- `registered` — registered voters at that election
- `ballots_cast` — total ballots cast in the precinct
- `baseline_votes` — votes for your baseline side
- `race_total_votes` — total votes cast in that race (used for support share and drop-off)

See `inputs/precinct-results-template.csv` and the worked example in `examples/rivertown-precincts.csv`.
