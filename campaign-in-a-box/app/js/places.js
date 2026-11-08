/* Campaign-in-a-Box app — where the candidate is running.
 * A small directory of official election offices, starting with Utah's 29 counties.
 * Add a state by copying the UT block and citing where each link came from.
 * Every entry carries the date it was last checked. MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const PL = (CIB.places = {});

  PL.STATES = [
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
    ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
    ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
    ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
    ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
    ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
    ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"]
  ];
  PL.stateName = (code) => (PL.STATES.find((s) => s[0] === code) || [])[1] || "";

  // Directory entries. Sources: vote.utah.gov “County Clerk Contact Information” (page updated Aug 31, 2026);
  // county results pages and the state results site checked Nov 7, 2026.
  PL.DIR = {
    UT: {
      checked: "2026-11-07",
      source: "vote.utah.gov County Clerk Contact Information",
      sourceUrl: "https://vote.utah.gov/county-clerk-contact-information",
      office: { name: "Utah Lieutenant Governor's Office — Elections", url: "https://vote.utah.gov" },
      results: [
        { label: "Utah election results (state results site, including city and town races)", url: "https://electionresults.utah.gov/results/public/Utah" },
        { label: "Official county canvass reports and past election records", url: "https://vote.utah.gov" }
      ],
      finance: { name: "Utah campaign finance disclosures (state, county and city candidates)", url: "https://disclosures.utah.gov" },
      tips: [
        "Most Utah cities and towns have their county run their elections, so the county clerk is usually the place to call about dates, ballots and results. Your city recorder can confirm.",
        "City and town election canvass reports are often posted on the Utah Public Notice Website (utah.gov/pmn) — search your city's name.",
        "Utah's state results site shows recent elections race by race. For precinct numbers, look for the county's “Statement of Votes Cast” (SOVC) or precinct canvass report."
      ],
      counties: [
        { name: "Beaver", url: "https://www.beaver.utah.gov/87/Elections", phone: "435-438-6463", address: "105 E. Center St., Beaver, UT 84713" },
        { name: "Box Elder", url: "https://www.boxeldercountyut.gov/320/Elections", phone: "435-734-3393", address: "01 S. Main St., Brigham City, UT 84302" },
        { name: "Cache", url: "https://www.cachecounty.org/elections/", phone: "435-755-1460", address: "179 North Main, Suite 102, Logan, UT 84321" },
        { name: "Carbon", url: "https://www.carbon.utah.gov/", phone: "435-636-3221", address: "751 E. 100 N. Suite 1100, Price, UT 84501" },
        { name: "Daggett", url: "https://www.daggettcounty.org/90/Elections", phone: "435-784-3154", address: "PO Box 400, Manila, UT 84046" },
        { name: "Davis", url: "https://www.daviscountyutah.gov/clerk/election/elections", phone: "801-451-3213", address: "61 S Main St., Farmington, UT 84025" },
        { name: "Duchesne", url: "https://duchesne.utah.gov/gov/elected-officials/clerk-auditor/elections-home/", phone: "435-738-1228", address: "734 N Center St., Duchesne, UT 84021" },
        { name: "Emery", url: "https://emerycounty.com/home/offices/clerk-auditor/election/", phone: "435-381-3550", address: "PO Box 907, Castle Dale, UT 84513" },
        { name: "Garfield", url: "https://www.garfield.utah.gov/departments/auditor-clerk", phone: "435-676-1120", address: "55 S Main, Panguitch, UT 84759" },
        { name: "Grand", url: "https://www.grandcountyutah.net/612/Elections", phone: "435-259-1321", address: "125 E Center, Moab, UT 84532" },
        { name: "Iron", url: "https://www.ironcountyut.gov/clerk", phone: "435-477-8340", address: "68 S 100 E, Parowan, UT 84761" },
        { name: "Juab", url: "http://www.co.juab.ut.us/County/clerk/election.html", phone: "435-623-3410", address: "160 North Main, Nephi, UT 84648" },
        { name: "Kane", url: "https://kane.utah.gov/311/Elections", phone: "435-644-2458", address: "76 N Main St., Kanab, UT 84741" },
        { name: "Millard", url: "https://millardcounty.gov/your-government/elected-officials/clerk/elections/", phone: "435-743-6223", address: "765 S Highway 99, Suite 6, Fillmore, UT 84631" },
        { name: "Morgan", url: "https://www.morgancountyutah.gov/election-information", phone: "801-845-4011", address: "48 West Young St., Room 18, Morgan, UT 84050" },
        { name: "Piute", url: "https://piute.gov/your-government/elected-officials/clerk-auditor/", phone: "435-577-2840", address: "PO Box 99, Junction, UT 84740" },
        { name: "Rich", url: "https://www.richcounty.gov/election/", phone: "435-793-2415", address: "20 South Main, Randolph, UT 84064" },
        { name: "Salt Lake", url: "https://slco.org/clerk/elections/", phone: "385-468-7400", address: "2001 South State St., #S1200, Salt Lake City, UT 84190",
          results: "https://www.saltlakecounty.gov/clerk/elections/election-results/" },
        { name: "San Juan", url: "https://sanjuancountyut.gov/clerk/page/candidates-application-general-election-information", phone: "435-587-3223", address: "PO Box 338, Monticello, UT 84535" },
        { name: "Sanpete", url: "https://www.sanpete.com/elections.html", phone: "435-835-2131", address: "160 North Main, Suite 202, Manti, UT 84642" },
        { name: "Sevier", url: "https://www.sevier.utah.gov/departments/clerk___auditor/index.php", phone: "435-893-0401", address: "PO Box 607, Richfield, UT 84701" },
        { name: "Summit", url: "https://www.summitcountyutah.gov/281/Voter-Registration-Elections", phone: "435-336-3204", address: "60 N Main, Coalville, UT 84017" },
        { name: "Tooele", url: "https://tooeleco.gov/departments/elections/", phone: "435-843-3140", address: "47 S Main #318, Tooele, UT 84074" },
        { name: "Uintah", url: "https://www.uintah.gov/departments/a_-_e_departments/clerk_auditor/election_information.php", phone: "435-781-5360", address: "147 East Main, Vernal, UT 84078" },
        { name: "Utah", url: "https://vote.utahcounty.gov/home", phone: "801-851-8128", address: "100 E Center, Room 3100, Provo, UT 84606",
          results: "https://vote.utahcounty.gov/results" },
        { name: "Wasatch", url: "https://www.wasatchcounty.gov/ClerkAuditor", phone: "435-657-3190", address: "25 North Main, Heber City, UT 84032" },
        { name: "Washington", url: "https://www.washco.utah.gov/departments/clerk-auditor/election-info/", phone: "435-301-7248", address: "111 E Tabernacle St, St George, UT 84770" },
        { name: "Wayne", url: "https://waynecountyutah.gov/pages/county-offices#clerk", phone: "435-836-1300", address: "18 South Main, Loa, UT 84747" },
        { name: "Weber", url: "https://www.weberelections.gov/", phone: "801-399-8034", address: "2380 Washington Blvd., #320, Ogden, UT 84401" }
      ]
    }
  };

  PL.dir = (state) => PL.DIR[state] || null;
  PL.counties = (state) => ((PL.DIR[state] || {}).counties || []).map((c) => c.name);
  PL.county = (state, name) => ((PL.DIR[state] || {}).counties || []).find((c) => c.name.toLowerCase() === String(name || "").toLowerCase()) || null;

  // Which place an office belongs to: city races are about the town, county and school races about the county, state races the state.
  PL.level = (office) => {
    const o = String(office || "").toLowerCase();
    if (/council|mayor|city|town|village|municipal/.test(o)) return "town";
    if (/school|county|commission|sheriff|clerk|assessor|treasurer|district attorney|judge/.test(o)) return "county";
    if (/state|legislat|assembly|senate|house|governor|congress/.test(o)) return "state";
    return "town";
  };
  PL.jurisdiction = (place, office) => {
    const lvl = PL.level(office);
    if (lvl === "town" && place.town) return place.town;
    if ((lvl === "county" || lvl === "town") && place.county) return `${place.county} County`;
    return PL.stateName(place.state) || place.town || "";
  };

  // A web search the candidate can open on purpose. It's the only time a place name leaves the app.
  PL.searchUrl = (place, what) => {
    const q = [place.county ? `${place.county} County` : "", PL.stateName(place.state), what].filter(Boolean).join(" ");
    return "https://duckduckgo.com/?q=" + encodeURIComponent(q);
  };
})(typeof window !== "undefined" ? window : globalThis);
