# The Win Number

Your win number is how many votes you need to win, plus a safety margin. Every door, dollar and mailer is measured against it.

## The formula

```
Projected turnout  = registered voters × expected turnout rate
Votes to win       = floor(projected turnout × 50%) + 1
Win number         = votes to win + (projected turnout × safety margin)
```

The workbook's `Win Number` tab does this for you. Default safety margin is 5%.

## Step by step

**1. Expected turnout rate.** Average the turnout rate (ballots cast ÷ registered) from your comparable past elections. Then adjust:
- Is this a presidential year, a midterm, an odd-year municipal election, or a special election? Only compare like with like. Odd-year local elections often turn out a fraction of presidential years.
- Is turnout trending up or down across your comparable elections? The workbook shows the trend so you can decide.
- Is something unusual on the ballot (a high-profile measure, a contested statewide race) that will raise turnout?

**2. Count drop-off.** Not everyone who votes marks every race. Local races further down the ballot can see a noticeable share of voters skip them. If your past results show "votes in this race" lower than "ballots cast," the workbook uses the race total to compute drop-off and applies it.

**3. Pick a margin.** 5% is a reasonable default. Use more if your turnout estimate is shaky, or if a third candidate could pull unpredictable votes.

## ⚖️ When 50% + 1 is the wrong target

The win-number formula assumes a two-candidate race decided by majority. **How your race is decided is set by state or local law.** Adjust:

| How winner is decided | What to target |
|---|---|
| Two candidates, plurality | 50% + 1 of votes cast in the race (default) |
| Three or more candidates, plurality | Less than 50% may win. Estimate each candidate's share; target the second-place candidate's projected votes + margin. Safer: still plan for 45–50%. |
| Majority required, with runoff | 50% + 1 to avoid a runoff; otherwise, top-two finish. Plan and budget for a possible runoff. |
| Ranked-choice voting | 50% + 1 *after* transfers. Plan for first choices plus second-choice support from voters of candidates likely to be eliminated. |
| Multi-seat ("vote for 3") | Target the projected vote total of the last-place winner from past elections, plus margin. Voters cast several votes, so 50% math doesn't apply. |
| Primary | Use primary turnout, which is usually much lower, and only the voters eligible for that primary. ⚖️ Open vs. closed primaries vary by state. |

## From win number to voter contact

The win number tells you *how many* votes. Your precinct targeting tells you *where*. The `Field Capacity` tab checks whether your volunteers can realistically reach enough voters:

```
Expected base votes (from supportive precincts)
+ Votes you must persuade or turn out
= Win number
```

If your volunteer capacity can't cover the gap, you need more volunteers, more weeks, or more paid contact (mail, digital), and the budget should reflect that.
