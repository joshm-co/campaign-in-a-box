/* Campaign-in-a-Box app — "What could you run for?"
 * What each office does, what it takes, what you can and can't change, real examples (with sources)
 * and made-up examples of what a first term could look like. Party-neutral by design: examples are
 * picked for what the office can do, not for who did it.
 * Every place gives these offices different names, terms and powers. ⚖️ = check locally.
 * To add an example: one sentence, a date, and a link to the source. Checked 2026-11-25. MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const OF = (CIB.offices = {});

  OF.CHECKED = "2026-11-25";
  OF.LEVELS = [
    ["town", "City or town"], ["school", "Schools"], ["county", "County"],
    ["special", "Special districts"], ["state", "State"], ["federal", "Federal"]
  ];

  // "If you care about … look at …" — a quick way in for people who know the problem, not the office.
  OF.CARES = [
    ["Roads, parks, zoning, new housing, water rates", ["council", "mayor"]],
    ["What kids learn, school budgets, school closures, teacher pay", ["school-board", "state-school-board"]],
    ["Property taxes, jails, county roads, public health", ["commission", "sheriff", "assessor"]],
    ["How elections are run", ["clerk", "lt-governor"]],
    ["Water supply, fire service, buses and trains", ["special"]],
    ["State laws, the state budget, how much cities and schools can do", ["state-house", "state-senate", "governor"]],
    ["Catching waste and fraud in government", ["state-auditor", "clerk", "county-attorney"]],
    ["National laws, federal land, immigration, the military", ["us-house", "us-senate"]]
  ];

  const src = (title, url) => ({ title, url });

  OF.LIST = [
    /* ---------------------------------------------------------------- city or town */
    {
      id: "council", level: "town", name: "City or town council member", ballot: "City Council",
      also: "Town council, city commission, alderman, board of trustees",
      summary: "Writes the city's laws and budget: zoning, roads, parks, water and sewer rates, police and fire funding.",
      does: ["Votes on the yearly budget and the property tax rate the city sets", "Passes ordinances — local laws on land use, noise, animals, water use, business licenses", "Approves or turns down zoning changes and big developments", "Hires and oversees the city manager in many cities", "Hears from residents at public meetings"],
      time: "Evening meetings 2–4 times a month, plus reading packets, committees and constituent calls — often 10–20 hours a week", term: "Usually 4 years", pay: "Usually a part-time stipend; ask your city recorder",
      first: "A great first office. Most council members keep a full-time job.",
      can: "Change what gets built and where, fix specific streets and parks, set fees and water rules, fund (or cut) city services.",
      cant: "Overrule state law (the state sets many limits on cities ⚖️), run schools, or act alone — every decision takes a majority vote.",
      real: [
        { what: "North Ogden City Council banned using drinking water on lawns, with tighter limits in a declared drought and $500 fines for repeat violations.", when: "April 2026", source: src("KSL", "https://www.ksl.com/article/51486624/north-ogden-oks-new-limits-on-outdoor-water-use-and-fines") },
        { what: "Park City Council unanimously approved a new 10-year general plan on housing, transportation, water and open space, built from open houses and neighborhood committees.", when: "September 2025", source: src("TownLift", "https://townlift.com/2025/09/park-city-approves-new-general-plan-focused-on-housing-transit-and-sustainability/") }
      ],
      ideas: ["Get a crosswalk and lower speed limit near an elementary school after hearing from parents at the door", "Change the rules so homeowners can add a backyard apartment", "Move council meetings online so people can comment without leaving work", "Start a yearly “budget in plain English” night before the budget vote"],
      fit: "You go to city meetings already, you like solving specific neighborhood problems, and you can work with people you disagree with.",
      ask: ["Is the seat elected citywide or by district?", "How many meetings a month, and what's the pay?", "Is it a council–manager or a strong-mayor city?"]
    },
    {
      id: "mayor", level: "town", name: "Mayor", ballot: "Mayor",
      also: "Town president",
      summary: "Leads the city. In some cities the mayor runs day-to-day operations; in others the mayor chairs the council and a manager runs things.",
      does: ["Proposes the budget (in a strong-mayor city) or helps shape it", "Runs or oversees city departments — police, public works, planning", "Signs or vetoes ordinances in some cities", "Speaks for the city to the state, the county and the public", "Appoints people to boards and commissions"],
      time: "Small towns: part-time. Big cities: more than full-time", term: "Usually 4 years", pay: "From a small stipend to a full salary, depending on city size",
      first: "Small-town mayor is a common first office. A big-city mayor usually has held office before.",
      can: "Set the city's agenda, pick department heads, push big projects and partnerships, and be the public face in a crisis.",
      cant: "Pass laws or budgets without the council, or ignore state limits on cities ⚖️. Your powers depend on your city's form of government.",
      real: [
        { what: "Salt Lake City's mayor released a 50-page public safety and homelessness plan: 27 city actions, including more police downtown and more shelter beds, plus 23 requests for the state and county.", when: "January 2025", source: src("KUER", "https://www.kuer.org/politics-government/2025-01-16/mendenhalls-new-homelessness-and-safety-plan-pushes-for-more-policing-state-help") },
        { what: "Mayors of 48 cities met with the governor, who asked them to help build 35,000 starter homes by the end of 2028 — mayors and councils control most of the zoning that decides it.", when: "May 2025", source: src("KSL", "https://www.ksl.com/article/51321910") }
      ],
      ideas: ["Hold office hours at the library every other Saturday", "Bring the county and two neighboring towns together on one shared trail", "Publish every city contract online", "Set up a small-business help desk at city hall"],
      fit: "You like leading, speaking in public and being the person people call when something goes wrong.",
      ask: ["Strong mayor or council–manager?", "Does the mayor vote on the council or have a veto?", "Is it full-time here?"]
    },
    /* ---------------------------------------------------------------- schools */
    {
      id: "school-board", level: "school", name: "School board member", ballot: "School Board",
      also: "Board of education, school district trustee",
      summary: "Oversees a school district: hires the superintendent, sets the budget and district policies.",
      does: ["Hires, evaluates and (if needed) replaces the superintendent", "Approves the district budget and a local property tax levy", "Sets district policies — phones, grading, discipline, school boundaries, calendars", "Decides to build, close or merge schools", "Approves teacher contracts and pay schedules"],
      time: "1–2 evening meetings a month plus committees, school visits and lots of email — about 5–15 hours a week", term: "Usually 4 years", pay: "Usually a small stipend",
      first: "A very common first office, especially for parents and former teachers.",
      can: "Set the district's priorities and policies, shape the budget, and choose who runs the district.",
      cant: "Run a school day to day (that's the superintendent and principals), or override state law and state standards ⚖️. One member alone has no authority.",
      real: [
        { what: "Washington County School District's board adopted a device policy: phones stay put away all day for kindergarten through ninth grade, with exceptions such as medical needs, after 30 days of public comment.", when: "May 2025", source: src("KSL", "https://www.ksl.com/article/51315286/washington-county-school-board-approves-new-cellphone-policy-for-students") },
        { what: "Provo City School District's board adopted a districtwide policy on phones, smartwatches and earbuds during school hours, starting January 2025.", when: "November 2024", source: src("Daily Herald", "https://www.heraldextra.com/news/local/2024/nov/19/provo-school-board-adopts-districtwide-electronic-device-policy-but-says-its-not-meant-to-demonize-cellphones/") }
      ],
      ideas: ["Move high school start times later after a parent and teacher survey", "Put every school's budget online in one plain page", "Partner with the city to open school playgrounds on weekends", "Start a paid apprenticeship pathway with local employers"],
      fit: "You care about schools, can read a budget, and can stay calm in heated public meetings.",
      ask: ["Is the race by district or at large?", "Is it partisan here? ⚖️", "How many meetings a month?"]
    },
    {
      id: "state-school-board", level: "school", name: "State board of education member", ballot: "State School Board",
      also: "State board of education",
      summary: "Sets statewide school standards, rules and some budgets for every district and charter school.",
      does: ["Adopts what students must learn in each subject (standards)", "Writes rules that all districts follow", "Oversees state testing and teacher licensing", "Approves budgets for state-run schools and some programs"],
      time: "Monthly board meetings plus committees — often 15–25 hours a week", term: "Usually 4 years", pay: "Small stipend ⚖️",
      first: "A good step after a local school board or a career in education.",
      can: "Change statewide standards and rules that every school follows.",
      cant: "Set school funding totals (the legislature does) or run districts directly.",
      real: [
        { what: "The Utah State Board of Education approved an updated behavior-intervention manual and rule, the budget for the Utah Schools for the Deaf and the Blind, and how one-time funds were split among charter schools.", when: "June 2025", source: src("Utah State Board of Education — meeting summary", "https://schools.utah.gov/board/utah/meetings/_meetingsummaries_/June2025BoardSummary.pdf") }
      ],
      ideas: ["Cut duplicate state reports that take teachers away from teaching", "Add financial literacy to high school standards", "Make licensing easier for experienced tradespeople who want to teach"],
      fit: "You know schools well and are comfortable with rules, data and long meetings.",
      ask: ["How big is the district I'd represent?", "Is the race partisan? ⚖️"]
    },
    /* ---------------------------------------------------------------- county */
    {
      id: "commission", level: "county", name: "County commissioner or county council member", ballot: "County Commission",
      also: "County commissioner, county council, board of supervisors",
      summary: "Runs county government: the budget and property tax, roads outside cities, jails, public health and land use in unincorporated areas.",
      does: ["Adopts the county budget and the county's property tax rate", "Funds the sheriff, jail, courts support, public health and county roads", "Decides zoning and growth outside city limits", "Sits on regional boards (transportation, health, emergency management)", "Hires county managers and department heads"],
      time: "Often full-time in larger counties; part-time in small ones", term: "Usually 4 years", pay: "Ranges from part-time pay to a full salary ⚖️",
      first: "Often a second office after city council, but first-time candidates win too.",
      can: "Change county spending and taxes, county land use, and how jails, roads and health services are funded.",
      cant: "Overrule other elected county officers in their own offices (sheriff, clerk, assessor) or state law ⚖️.",
      real: [
        { what: "Utah County's commission adopted a 2025 budget raising the county's share of property tax by about 48% to fund law enforcement, public safety and roads, with one commissioner abstaining.", when: "December 2024", source: src("KSL", "https://www.ksl.com/article/51214016/utah-county-approves-absolutely-necessary-tax-increase-for-2025-budget") }
      ],
      ideas: ["Publish a simple “where your county tax dollar goes” chart on every tax notice", "Pave the five worst county roads first, using a public rating list", "Bring cities together on one shared emergency alert system", "Pay for a mental-health crisis team so deputies aren't the only responders"],
      fit: "You like big-picture budgets, can explain a tax decision to an angry room, and want to work across many towns.",
      ask: ["Commission (3 members) or council with a mayor/manager? ⚖️", "Full-time or part-time?", "Is it by district or countywide?"]
    },
    {
      id: "clerk", level: "county", name: "County clerk (or clerk/auditor)", ballot: "County Clerk",
      also: "County clerk/auditor, registrar of voters, election administrator",
      summary: "Often runs the county's elections, keeps official records and issues marriage licenses. In many places also the county's auditor.",
      does: ["Runs elections: voter lists, ballots, vote counting, results ⚖️", "Keeps the official minutes and records of the county", "Issues marriage licenses and other certificates", "As auditor: checks county spending and prepares tax rolls ⚖️"],
      time: "Full-time; long hours around elections", term: "Usually 4 years", pay: "County salary",
      first: "Often won by people with office-management, accounting or election experience.",
      can: "Make voting easier and more trusted, improve customer service and modernize records.",
      cant: "Change election law (the legislature does) or decide who wins — the job is to run elections neutrally.",
      real: [
        { what: "Weber County's clerk/auditor office set up a texting system for poll workers on Election Day so problems got answered quickly from one shared inbox.", when: "2016", source: src("Center for Tech and Civic Life", "https://www.techandciviclife.org/weber-county-utah/") }
      ],
      ideas: ["Add a second ballot drop box in the fastest-growing part of the county", "Post a short video showing how ballots are counted", "Let couples fill in marriage license forms online before they come in"],
      fit: "You're organized, careful, calm under deadlines and committed to running fair elections for everyone.",
      ask: ["Does the clerk run elections here, or a separate office? ⚖️", "Is the clerk also the auditor?"]
    },
    {
      id: "recorder", level: "county", name: "County recorder", ballot: "County Recorder",
      also: "Register of deeds",
      summary: "Keeps the official record of who owns land — deeds, mortgages, liens and plats.",
      does: ["Records deeds, mortgages, liens and subdivision maps", "Keeps ownership maps and parcel records", "Makes records searchable for the public, title companies and courts"],
      time: "Full-time", term: "Usually 4 years", pay: "County salary",
      first: "Fits people with title, real-estate, mapping or records experience.",
      can: "Protect homeowners from fraud, speed up recording, and make land records easy to search.",
      cant: "Decide disputes over ownership — courts do.",
      real: [
        { what: "Salt Lake County's recorder created Property Watch, free alerts when any document is recorded on your property. The state later required a similar service in every Utah county (S.B. 165).", when: "2019; state law 2024", source: src("Salt Lake County", "https://www.saltlakecounty.gov/news-archives/2024/salt-lake-countys-online-property-watch-program-leads-to-statewide-mandate-intended-to-protect-property-owners") },
        { what: "Gregg County, Texas started a free title-fraud alert program run by its county clerk.", when: "2022", source: src("Governing", "https://www.governing.com/security/counties-launch-property-fraud-alert-programs") }
      ],
      ideas: ["Put old plat maps online so residents can see original lot lines", "Run a fraud-alert sign-up drive with senior centers", "Cut recording time to same-day"],
      fit: "You like accuracy, records and quiet public service that protects people.",
      ask: ["Is the recorder elected here, or combined with another office? ⚖️"]
    },
    {
      id: "assessor", level: "county", name: "County assessor", ballot: "County Assessor",
      also: "Property appraiser",
      summary: "Puts a value on every property in the county, which decides how property tax is shared.",
      does: ["Values homes, land and business property each year", "Keeps property data up to date", "Applies exemptions (for example a primary residence) ⚖️", "Defends values when owners appeal"],
      time: "Full-time", term: "Usually 4 years", pay: "County salary",
      first: "Often won by appraisers or real-estate professionals; some states require a certification ⚖️.",
      can: "Make values fair and up to date, and explain them clearly to owners.",
      cant: "Set tax rates — cities, counties and school boards do. Higher values don't by themselves raise total taxes in many states ⚖️.",
      real: [
        { what: "Wasatch County brought in a company to reappraise more properties after years of fast growth left many homes undervalued, and explained to owners how to appeal.", when: "2023", source: src("KPCW", "https://www.kpcw.org/wasatch-county/2023-08-01/wasatch-county-fielding-property-value-appeals-from-residents-concerned-about-taxes") }
      ],
      ideas: ["Send a plain-language letter with every value notice explaining what changed", "Hold evening appeal help nights", "Publish neighborhood sale prices used in valuations"],
      fit: "You understand real estate and can explain numbers to unhappy property owners.",
      ask: ["Is a state certification required to run or serve? ⚖️"]
    },
    {
      id: "treasurer", level: "county", name: "County treasurer", ballot: "County Treasurer",
      summary: "Collects property taxes, holds and invests the county's money, and sends each city and school district its share.",
      does: ["Bills and collects property taxes", "Invests county funds safely", "Distributes tax money to cities, schools and districts", "Runs tax relief programs for qualifying owners ⚖️", "Handles delinquent taxes and tax sales"],
      time: "Full-time", term: "Usually 4 years", pay: "County salary",
      first: "Fits people with finance, banking or accounting backgrounds.",
      can: "Make paying easier, help eligible people get tax relief, and earn safe returns on public money.",
      cant: "Set tax rates or decide who qualifies for relief — state law does ⚖️.",
      real: [
        { what: "Salt Lake County's treasurer takes applications for Utah's Circuit Breaker program, which lowers property taxes on the homes of qualifying seniors and widows with limited income.", when: "Ongoing", source: src("Salt Lake County Treasurer", "https://www.saltlakecounty.gov/treasurer/tax-relief/circuit-breaker/") }
      ],
      ideas: ["Run outreach so every eligible senior applies for tax relief", "Offer monthly payment plans to avoid tax sales", "Publish the county's investments and returns every quarter"],
      fit: "You're careful with money and enjoy making a process simpler for the public.",
      ask: ["Is the treasurer elected here? ⚖️"]
    },
    {
      id: "sheriff", level: "county", name: "Sheriff", ballot: "Sheriff",
      summary: "Runs the county's law enforcement and, in most places, the county jail.",
      does: ["Leads deputies who patrol areas outside city police departments", "Runs the jail", "Provides court security and serves court papers", "Leads search and rescue and parts of emergency response ⚖️"],
      time: "Full-time and on call", term: "Usually 4 years", pay: "County salary",
      first: "Usually requires police certification or experience ⚖️.",
      can: "Set priorities for patrol, run the jail differently, and start programs that keep people from coming back.",
      cant: "Set your own budget (the county commission does) or change criminal law.",
      real: [
        { what: "Weber County's sheriff's office started reentry case managers and peer supporters in the jail. The county reported a 45% drop in local reoffending and nearly $1 million in savings early on.", when: "Reported January 2026", source: src("Weber County", "https://webercountyutah.gov/news/post.php?id=267") },
        { what: "Sanpete County's jail added a community health worker for addiction screening and support. Repeat bookings fell 61% over 18 months.", when: "Reported May 2024", source: src("Daily Herald", "https://www.heraldextra.com/sanpete-county/2024/may/29/intermountain-health-community-health-worker-program-reduces-recidivism-by-61-at-sanpete-county-jail/") }
      ],
      ideas: ["Add a deputy who rides along with a mental-health worker", "Publish response times by area each month", "Start a job-training program inside the jail"],
      fit: "You have law enforcement experience and want to lead an agency the whole county trusts.",
      ask: ["What certification is required to run? ⚖️"]
    },
    {
      id: "county-attorney", level: "county", name: "County attorney or district attorney", ballot: "County Attorney",
      also: "District attorney, prosecutor, state's attorney",
      summary: "Prosecutes crimes and gives the county legal advice.",
      does: ["Decides which cases to charge and how to handle them", "Leads prosecutors in court", "Advises county officials and defends the county in lawsuits ⚖️", "Runs victim services and diversion programs"],
      time: "Full-time", term: "Usually 4 years", pay: "County salary",
      first: "Must be a licensed lawyer.",
      can: "Set charging priorities, start diversion programs and change how victims are supported.",
      cant: "Write criminal law or decide guilt — the legislature and courts do.",
      real: [
        { what: "Salt Lake County's district attorney started a program that sends some low-level cases to case managers and classes before charges are filed. Over 90% finish successfully.", when: "2019 (results reported 2025)", source: src("Advancing Pretrial Policy & Research", "https://www.advancingpretrial.org/story/off-ramp-prosecutor-led-diversion-in-salt-lake-county/") }
      ],
      ideas: ["Create a unit for elder fraud cases", "Publish charging data every quarter", "Offer a drug court option for first offenses"],
      fit: "You're a lawyer who wants to shape how justice works in your county.",
      ask: ["Does the county attorney also handle civil work here? ⚖️"]
    },
    /* ---------------------------------------------------------------- special districts */
    {
      id: "special", level: "special", name: "Special district board member", ballot: "Water/Fire District Board",
      also: "Water, sewer, fire, parks, library, transit, mosquito abatement, cemetery boards",
      summary: "Runs one public service for an area — water, fire, sewer, parks, transit — with its own budget and often its own tax or rates.",
      does: ["Sets rates or a tax levy for the service", "Approves big projects (reservoirs, fire stations, pipes)", "Hires the general manager or chief", "Sets conservation and service policies"],
      time: "Usually one meeting a month", term: "2–6 years ⚖️", pay: "Small per-meeting pay, if any",
      first: "One of the easiest ways in: few candidates, small races. Some boards are appointed instead of elected ⚖️.",
      can: "Shape a service everyone depends on — rates, long-term projects and conservation.",
      cant: "Do anything outside that one service.",
      real: [
        { what: "Washington County's water conservancy district and its eight cities adopted Utah's first regional water conservation plan, aiming to cut use 7.7% by 2030.", when: "October 2025", source: src("Salt Lake Tribune", "https://www.sltrib.com/news/2025/10/28/washington-county-oks-plan-save-17") },
        { what: "Four water conservancy districts and the state paid residents over $7 million to replace 3 million square feet of lawn, expected to save over 100 million gallons a year.", when: "2024", source: src("Utah Division of Water Resources", "https://water.utah.gov/residents-of-utah-saved-over-100-million-gallons-of-water-through-landscape-conversions-in-2024") }
      ],
      ideas: ["Post a live map of water main repairs", "Offer free leak checks for older homes", "Add a citizen advisory group before any rate increase"],
      fit: "You want to fix one thing well and don't mind technical details.",
      ask: ["Is this board elected or appointed here? ⚖️", "When does the seat come up?"]
    },
    /* ---------------------------------------------------------------- state */
    {
      id: "state-house", level: "state", name: "State representative", ballot: "State House",
      also: "Assembly member, delegate",
      summary: "Writes state laws and the state budget, for a district of tens of thousands of people.",
      does: ["Writes, debates and votes on bills", "Votes on the state budget", "Sits on committees (education, transportation, health…)", "Helps constituents with state agencies", "Decides how much cities, counties and schools are allowed to do"],
      time: "In Utah, a 45-day session each year (2027: January 19 – March 5) plus monthly interim meetings; many legislators keep other jobs ⚖️", term: "2 years", pay: "Utah: $293.55 per legislative day (2024) ⚖️",
      first: "Many come from city council or school board, but first-time candidates win, often in open seats.",
      can: "Change state law on almost anything: schools, roads, taxes, elections, health, criminal law.",
      cant: "Pass anything alone — a bill needs both chambers and the governor (or enough votes to override).",
      real: [
        { what: "H.B. 33 changed Utah's political sign rules: smaller signs exempt from the “Paid for by” line from 2027, no signs on utility poles, and removal within 14 days after an election.", when: "2026", source: src("Utah Legislature", "https://le.utah.gov/~2026/bills/static/HB0033.html") },
        { what: "S.B. 178 made phones-away during class the default in Utah schools, with exceptions for emergencies, disabilities and medical needs. A state representative sponsored it in the House.", when: "2025", source: src("KPCW", "https://www.kpcw.org/state-regional/2025-02-28/utah-student-cellphone-ban-heads-to-the-governor-for-approval") }
      ],
      ideas: ["Pass a bill letting small towns share one building inspector", "Fix one confusing tax form constituents keep calling about", "Require state agencies to answer public records requests faster"],
      fit: "You like writing rules, negotiating, and can be away from work for several weeks a year ⚖️.",
      ask: ["How big is my district?", "When is the filing period for state races? ⚖️"]
    },
    {
      id: "state-senate", level: "state", name: "State senator", ballot: "State Senate",
      summary: "Writes state laws and the budget like a representative, for a bigger district and a longer term.",
      does: ["Writes and votes on bills and the budget", "Confirms many of the governor's appointments ⚖️", "Leads committees", "Helps constituents with state agencies"],
      time: "Same session schedule as the House ⚖️", term: "4 years in most states ⚖️", pay: "Same as representatives in Utah ⚖️",
      first: "Usually a second office, after the House or local office.",
      can: "Change state law and confirm appointments.",
      cant: "Act alone — bills still need the other chamber and the governor.",
      real: [
        { what: "S.B. 165 required every Utah county recorder to offer alerts when documents are recorded on a property, based on Salt Lake County's program.", when: "2024", source: src("Salt Lake County", "https://www.saltlakecounty.gov/news-archives/2024/salt-lake-countys-online-property-watch-program-leads-to-statewide-mandate-intended-to-protect-property-owners") }
      ],
      ideas: ["Take a good local program statewide", "Require plain-language summaries on every bill", "Fund a rural broadband grant program"],
      fit: "You've served before or know state issues well, and want a bigger district.",
      ask: ["Is this seat up this year? (Senate terms are often staggered ⚖️)"]
    },
    {
      id: "governor", level: "state", name: "Governor", ballot: "Governor",
      summary: "Runs the state's executive branch and signs or vetoes laws.",
      does: ["Proposes the state budget", "Signs or vetoes bills", "Appoints agency heads and judges ⚖️", "Leads in emergencies", "Sets statewide priorities"],
      time: "Full-time", term: "4 years", pay: "Utah: $182,900 (Ballotpedia) ⚖️",
      first: "Almost always someone who has held office before.",
      can: "Set the state's agenda, run state agencies and shape laws through the veto.",
      cant: "Pass laws or budgets without the legislature.",
      real: [
        { what: "Utah's governor asked mayors of 48 cities to help build 35,000 starter homes by the end of 2028 and launched a public dashboard tracking progress.", when: "May 2025", source: src("KSL", "https://www.ksl.com/article/51321910") }
      ],
      ideas: ["Cut state permit wait times in half and publish the times", "Start a statewide apprenticeship program with employers"],
      fit: "You've led large organizations or held office, and can run a statewide campaign.",
      ask: ["How much money do statewide campaigns usually cost here?"]
    },
    {
      id: "lt-governor", level: "state", name: "Lieutenant governor (or secretary of state)", ballot: "Lieutenant Governor",
      also: "Secretary of state",
      summary: "Next in line to the governor. In Utah, also the state's chief election officer ⚖️.",
      does: ["Takes over if the governor can't serve", "In Utah: oversees elections statewide, certifies results, and manages ballot initiatives ⚖️", "Keeps official state records"],
      time: "Full-time", term: "4 years", pay: "Utah: $164,610 (Ballotpedia)",
      first: "Usually someone with prior office; in Utah, runs on a ticket with the governor ⚖️.",
      can: "Shape how elections are run statewide and how open state records are.",
      cant: "Write election law — the legislature does.",
      real: [
        { what: "Utah's lieutenant governor's office publishes ballot initiative signature packets online. A 2024 bill proposed moving election oversight to a separate office, a reminder that the legislature decides this office's duties.", when: "2024", source: src("KSL", "https://www.ksl.com/article/51191712/the-future-of-utah-elections") }
      ],
      ideas: ["Publish post-election audit results in one place", "Run a statewide poll worker recruitment drive"],
      fit: "You care about elections being fair and trusted, and can run statewide.",
      ask: ["Is this office elected separately or on a ticket? ⚖️"]
    },
    {
      id: "attorney-general", level: "state", name: "Attorney general", ballot: "Attorney General",
      summary: "The state's top lawyer: represents the state in court, enforces consumer protection laws and advises agencies.",
      does: ["Represents the state in lawsuits", "Protects consumers from scams and unfair business practices", "Joins or leads lawsuits with other states", "Advises state agencies"],
      time: "Full-time", term: "4 years", pay: "Utah: $173,755 (Ballotpedia)",
      first: "Must be a licensed lawyer ⚖️.",
      can: "Choose which big cases to bring, protect consumers and recover money for the state.",
      cant: "Write laws or decide cases.",
      real: [
        { what: "Utah's opioid settlements with drug makers, distributors and pharmacies passed $500 million, shared with counties for treatment, recovery and prevention.", when: "November 2024", source: src("Utah Attorney General", "https://attorneygeneral.utah.gov/ag-reyes-and-a-bipartisan-coalition-of-states-announce-a-settlement-with-kroger-for-1-37-billion/") }
      ],
      ideas: ["Start a unit focused on scams aimed at seniors", "Publish a yearly report of money recovered for consumers"],
      fit: "You're an experienced lawyer who wants to protect the public.",
      ask: ["What are the bar membership requirements to run? ⚖️"]
    },
    {
      id: "state-auditor", level: "state", name: "State auditor", ballot: "State Auditor",
      summary: "Checks how state and local governments spend money and protect data.",
      does: ["Audits state agencies, cities and districts", "Investigates tips from whistleblowers", "Reports problems publicly and recommends fixes"],
      time: "Full-time", term: "4 years", pay: "Utah: $164,610 (Ballotpedia)",
      first: "Often accountants or auditors (some states require a certification ⚖️).",
      can: "Shine a light on waste, fraud and risks so they get fixed.",
      cant: "Force fixes — that's up to lawmakers and agencies.",
      real: [
        { what: "Utah's state auditor reported that records on more than 2 million people at the health department weren't well protected, with over 1,200 people able to see sensitive files, and recommended stricter access.", when: "February 2026", source: src("KSL", "https://www.ksl.com/article/51446544") }
      ],
      ideas: ["Audit how quickly cities answer records requests", "Publish a yearly “top 10 fixes” list and track whether they happened"],
      fit: "You love finding problems in numbers and explaining them clearly.",
      ask: ["Is a CPA or similar certification required? ⚖️"]
    },
    {
      id: "state-treasurer", level: "state", name: "State treasurer", ballot: "State Treasurer",
      summary: "Manages the state's cash and investments, and often returns lost money to its owners.",
      does: ["Invests state money", "Manages state debt and bond sales", "Runs the unclaimed property program ⚖️", "Sits on state finance boards"],
      time: "Full-time", term: "4 years", pay: "Utah: $164,610 (Ballotpedia)",
      first: "Often people with finance backgrounds.",
      can: "Earn safe returns, lower borrowing costs, and reunite people with lost money.",
      cant: "Set the budget or taxes.",
      real: [
        { what: "Utah's treasurer returned a record $43.4 million in unclaimed cash to owners through about 17,000 claims.", when: "Fiscal year 2025", source: src("Utah State Treasurer", "https://treasurer.utah.gov/featured-news/treasurer-marlo-oaks-announces-record-43-4-million-in-unclaimed-cash-returned-to-utahns-in-fy-2025/") }
      ],
      ideas: ["Send unclaimed money automatically when the owner is easy to find", "Publish state investment returns in plain language"],
      fit: "You know finance and want to make it work for ordinary people.",
      ask: ["Any finance qualifications required? ⚖️"]
    },
    /* ---------------------------------------------------------------- federal */
    {
      id: "us-house", level: "federal", name: "U.S. representative", ballot: "U.S. House",
      also: "Member of Congress",
      summary: "Writes federal laws and the federal budget for a district of about 760,000 people.",
      does: ["Writes and votes on federal bills", "Votes on federal spending", "Serves on committees", "Helps constituents with federal agencies (Social Security, veterans, passports)"],
      time: "More than full-time, split between Washington and home", term: "2 years", pay: "Federal salary",
      first: "Rarely a first office; campaigns are large and expensive. This kit's tools are built for smaller races.",
      can: "Shape national law and steer federal attention to your district.",
      cant: "Pass anything without the Senate and president.",
      real: [
        { what: "A Utah congressman co-led a bipartisan bill, signed into law, funding scientific monitoring of the Great Salt Lake and other saline lakes.", when: "December 2022", source: src("Office of Rep. Blake Moore", "https://blakemoore.house.gov/media/press-releases/president-biden-signs-law-congressman-blake-moores-bill-help-save-great-salt") },
        { what: "The Great Salt Lake Stewardship Act opened an existing federal water-conservation program to the whole Great Salt Lake basin.", when: "Signed December 2024 (Public Law 118-169)", source: src("Congress.gov", "https://www.congress.gov/118/plaws/publ169/PLAW-118publ169.htm") }
      ],
      ideas: ["Pass a bill moving a small piece of federal land to a city for a park", "Run a caseworker clinic for veterans in every county of the district"],
      fit: "You've held office or led large efforts, and can raise serious money.",
      ask: ["What are the federal filing and finance rules? (Federal Election Commission)"]
    },
    {
      id: "us-senate", level: "federal", name: "U.S. senator", ballot: "U.S. Senate",
      summary: "Writes federal laws for a whole state, confirms judges and cabinet members, and approves treaties.",
      does: ["Writes and votes on federal bills and spending", "Confirms federal judges and appointees", "Approves treaties", "Helps constituents with federal agencies"],
      time: "More than full-time", term: "6 years", pay: "Federal salary",
      first: "Almost always someone who has held office before; statewide campaigns cost the most.",
      can: "Shape national law and appointments.",
      cant: "Pass anything without the House and president.",
      real: [
        { what: "A 2019 public lands package passed the Senate 92–8 and included an Emery County plan negotiated locally — new wilderness, a recreation area and a larger state park. Utah's two senators voted differently.", when: "February 2019", source: src("Salt Lake Tribune", "https://sltrib.com/news/politics/2019/02/27/congress-passes-massive") },
        { what: "The land exchange in that law was completed: Utah received about 83,000 acres plus 47 water rights, and the federal government about 116,000 acres of scattered state land.", when: "February 2025", source: src("Bureau of Land Management", "https://www.blm.gov/press-release/landmark-dingell-act-land-exchange-completed") }
      ],
      ideas: ["Work with the other party's senators on one water bill for the West"],
      fit: "You've led statewide and can run a very large campaign.",
      ask: ["Federal Election Commission rules apply from the start."]
    }
  ];

  OF.byId = (id) => OF.LIST.find((o) => o.id === id) || null;
  OF.forLevel = (lvl) => (lvl ? OF.LIST.filter((o) => o.level === lvl) : OF.LIST);
  // Guess the guide entry for whatever the candidate typed as their office.
  OF.match = (office) => {
    const o = String(office || "").toLowerCase();
    if (!o) return null;
    const rules = [[/u\.?s\.? ?senat|united states senat/, "us-senate"], [/congress|u\.?s\.? ?house|u\.?s\.? ?rep/, "us-house"], [/lieutenant|secretary of state/, "lt-governor"], [/governor/, "governor"], [/attorney general/, "attorney-general"],
      [/state auditor/, "state-auditor"], [/state treasurer/, "state-treasurer"], [/state (board of education|school)/, "state-school-board"], [/state senat|senate/, "state-senate"], [/state house|state rep|assembly|delegate|legislat/, "state-house"],
      [/school|education|trustee/, "school-board"], [/sheriff/, "sheriff"], [/county attorney|district attorney|prosecut/, "county-attorney"], [/assessor|apprais/, "assessor"], [/recorder|deeds/, "recorder"],
      [/treasurer/, "treasurer"], [/clerk|auditor|registrar/, "clerk"], [/commission|county council|supervisor/, "commission"], [/water|fire|sewer|district board|transit|library|park district|mosquito|cemetery/, "special"],
      [/mayor/, "mayor"], [/council|alder|trustee|town board/, "council"]];
    const hit = rules.find(([re]) => re.test(o));
    return hit ? OF.byId(hit[1]) : null;
  };
})(typeof window !== "undefined" ? window : globalThis);
