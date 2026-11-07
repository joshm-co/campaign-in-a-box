# Intake Checklist — What the Kit Needs and Where to Get It

Fill this in before opening the workbook. Copy it, check items off, and keep source links so you can update later.

Legend: ⚖️ = STATE LAW VARIES (confirm locally) · 🆓 = free source

---

## 1. The race

| Input | Your answer | Where to get it |
|---|---|---|
| Office sought | | Your state or county election office website |
| District / ward / seat number | | Election office; district maps from the county GIS office |
| Election Day | | State election office 🆓 |
| Is there a primary? Date? | | State election office ⚖️ |
| Partisan or nonpartisan race? | | State election office ⚖️ |
| How the winner is decided (plurality, majority + runoff, ranked choice, multi-seat "top N") | | State/local election law ⚖️ — **this changes your win number** |
| Candidate filing deadline | | Election office ⚖️ |
| Filing requirements (fee, petition signatures, residency) | | Election office ⚖️ |
| Voter registration deadline | | State election office ⚖️ (some states allow same-day registration) |
| Mail ballot send date | | County election office ⚖️ |
| Early in-person voting start and end | | County election office ⚖️ |
| Campaign finance reporting dates and contribution limits | | State ethics or campaign finance agency ⚖️ |

## 2. Voters and past results

| Input | Your answer | Where to get it |
|---|---|---|
| Current registered voters in district | | County election office (often a free report) 🆓 |
| Voter file (names, addresses, vote history) | | County or state election office ⚖️ — rules on who can buy it, the cost, and permitted uses vary by state. Some states restrict it to candidates or committees. |
| Registered voters by precinct | | County election office 🆓 |
| Precinct results, last 3–4 **comparable** elections | | County election office "official results" archive 🆓 |

**What counts as "comparable":** same office or a similar local race, same type of election (a November general in a non-presidential year is not comparable to a presidential year), same district lines. If lines changed after redistricting, note which precincts moved.

Enter results in `inputs/precinct-results-template.csv` or straight into the workbook's `Precincts` tab.

**Choosing a "baseline" race (for nonpartisan races):** pick a past race or ballot measure where one side looks most like your likely coalition. You'll use its vote share by precinct as your support estimate. Write down why you chose it.

## 3. Demographics and language

| Input | Your answer | Where to get it |
|---|---|---|
| Population, age, housing tenure (own/rent) | | U.S. Census Bureau, American Community Survey (ACS) 5-year estimates at data.census.gov 🆓 |
| Languages spoken at home and "speaks English less than very well" share | | ACS table on language spoken at home (search "language spoken at home" on data.census.gov) 🆓 |
| Whether your county must provide election materials in other languages | | Federal Voting Rights Act Section 203 coverage list (published by the Census Bureau) 🆓 |

**Rule of thumb for this kit:** if 5% or more of adults in your district speak a language other than English and speak English less than "very well," plan translated materials in Step 2. Lower thresholds may still be worth it in specific precincts.

## 4. Resources

| Input | Your answer | Notes |
|---|---|---|
| Budget range (low / likely / high) | | Be honest. Plan to the *likely* number, not the hoped-for one. |
| Money already committed | | Pledges don't count until they arrive. |
| Volunteers you can count on weekly | | Names, not estimates. |
| Volunteer hours per person per week | | Most volunteers give 2–4 hours a week. |

## 5. Candidate

| Input | Where it comes from |
|---|---|
| Structured interview answers | `inputs/candidate-interview.md` |
| Self-research results | `strategy/vulnerability-checklist.md` |

## 6. Opponent(s) and rules

| Input | Where to get it |
|---|---|
| Who has filed or is expected to | Election office candidate list 🆓 |
| Opponent's public record: votes, statements, campaign finance reports | Meeting minutes, local news archives, campaign finance agency 🆓 |
| Required disclaimer ("Paid for by…") wording for print, digital, and broadcast | State campaign finance law ⚖️ — wording, font size and placement vary |
| Yard sign rules: when signs may go up, where, how long after Election Day they must come down, size limits | City or county code; state highway department for public rights-of-way ⚖️ |
| Distance limits for campaigning near polling places | State election law ⚖️ |

---

**Only research public records about opponents.** Stick to their public record — votes, statements, filings, and official actions. Don't dig into private family matters or anything that would put private people at risk.
