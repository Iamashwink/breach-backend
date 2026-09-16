/**
 * Signal Zero content, transcribed from `Signal_Zero_Narration_With_Flags_Final.md`.
 *
 * This is data, not logic: the seed script turns it into core_challenge rows
 * (title, flag, scoring) and sz_path_challenge rows (story, tier, sequence).
 * Editing the narration means editing this file and re-running the seed.
 *
 * C8 ships as ONE combined flag. The narration authors it as two parts, but
 * decision C6 allows one flag per challenge, and splitting it would make Path C
 * eleven challenges long — which would break the sequence constraint, the
 * eight-solves-to-switch rule and the three-exposed reveal window at once. Its
 * two-part narration is preserved by folding the INTERMEDIATE beat into the
 * pre-story.
 */

export type SeedTier = "past" | "present" | "future";
export type SeedDifficulty = "easy" | "medium" | "hard" | "expert";

export interface SeedPathChallenge {
  code: string;
  sequence: number;
  tier: SeedTier;
  category: string;
  difficulty: SeedDifficulty;
  title: string;
  preStory: string;
  postStory: string;
  flag: string;
  isPathFinal?: boolean;
  fragmentKey?: "who" | "how" | "why";
}

/** The six categories the narration draws on. */
export const SEED_CATEGORIES = [
  "OSINT",
  "Forensics",
  "Cryptography",
  "Web Exploitation",
  "Reverse Engineering",
  "Misc",
] as const;

/**
 * Points by difficulty. Every challenge decays logarithmically from initial to
 * min over 25 solves, which is the core default.
 */
export const SEED_POINTS: Record<SeedDifficulty, { initial: number; min: number }> = {
  easy: { initial: 100, min: 50 },
  medium: { initial: 250, min: 100 },
  hard: { initial: 400, min: 150 },
  expert: { initial: 500, min: 200 },
};

export const SEED_PATHS = [
  {
    code: "A",
    name: "THE ARCHIVIST",
    delivers: "who" as const,
    introNarration:
      "You are not incident responders and you are not scientists. You are the people who go looking after everyone else has stopped asking questions — former Meridian staff who left with more doubts than severance pay, journalists who noticed the same shell company twice, OSINT researchers who never quite believed \"divergence event\" meant what the official report wanted it to mean. Nobody assigned you this. You assigned it to yourselves, years ago, in a forum that mostly talks to itself now. Signal Zero just proved you were right to keep watching.",
  },
  {
    code: "B",
    name: "THE BREACH",
    delivers: "how" as const,
    introNarration:
      "There's no history to reconstruct here, not really — there's a network, live, right now, doing something it shouldn't be able to do, on your watch. You're the shipping conglomerate's incident response team, and the thing that just started writing to an air-gapped backup array isn't a metaphor for anyone. It's a live intrusion with no visible entry point, and it's still moving.",
  },
  {
    code: "C",
    name: "THE PROTOCOL",
    delivers: "why" as const,
    introNarration:
      "You inherited a fragment of ECHO without knowing what it was — a research artifact, half-documented, that started producing outputs the day the other two signals went out. You're not defending a network and you're not chasing a paper trail. You're trying to understand what a machine that predicts the future is actually predicting — and the growing, specific fear that it's starting to predict you.",
  },
] as const;

export const SEED_PATH_CHALLENGES: Record<string, SeedPathChallenge[]> = {
  A: [
    {
      code: "A1",
      sequence: 1,
      tier: "past",
      category: "OSINT",
      difficulty: "easy",
      title: "Ash and Bare Rock",
      preStory:
        "A decade-old forum thread, half-dead, still has its image attachments live. One photo — no caption, no location tag, just ash, bare rock, and old snow under a heavy sky — was never meant to say where it was taken. Smoke fades. The ground it settled on doesn't forget that easily.",
      postStory:
        "You've placed it: a second Meridian site, never in any filing, any press release, any employee handbook. Meridian had an annex it never told anyone about. That's not an oversight. That's a redaction with the paperwork missing.",
      flag: "BreachPoint{64.2625,-16.0333}",
    },
    {
      code: "A2",
      sequence: 2,
      tier: "past",
      category: "Forensics",
      difficulty: "easy",
      title: "The Recording in the Wreckage",
      preStory:
        "The account that posted that photo went dark in 2011, and most of what it left behind is unreadable — fragments, corruption, nothing usable on its own. One thing survived intact: a recording, filed alongside the wreckage, that nobody ever explained. Not every trace that matters is text.",
      postStory:
        "Pulled out of the recording and unlocked, the message confirms it: the whistleblower flagged a specific budget line as fabricated months before Meridian shut down — and nobody above them ever answered.",
      flag: "BreachPoint{budg37_l1n3_n1n3_w45_n3v3r_r34l}",
    },
    {
      code: "A3",
      sequence: 3,
      tier: "past",
      category: "Cryptography",
      difficulty: "medium",
      title: "Access Credential IRIS",
      preStory:
        "A redacted internal memo about \"access credential IRIS\" survives in an old radio handover log and a keyed cipher. Whoever encrypted it left the key close to the surface, almost like they wanted a careful reader to find it.",
      postStory:
        "The memo is clear, and it changes everything you thought you knew going in: IRIS was never one person. It was a shared, rotating login used by multiple people at once — sometimes, the audit trail shows, at the exact same moment from different terminals. You came in looking for a name. You're leaving with a bigger question.",
      flag: "BreachPoint{1r15_15_4_l0g1n_n07_4_p3r50n}",
    },
    {
      code: "A4",
      sequence: 4,
      tier: "present",
      category: "OSINT",
      difficulty: "medium",
      title: "Out of Order",
      preStory:
        "Someone is still updating a \"memorial\" fan site for Meridian, quietly, through one linked account — @ctfjohnnn — that looks like it's just posting the usual mix of nothing. Feeds don't rearrange themselves by accident, and this one has. What matters here may not be what you expect at first glance.",
      postStory:
        "The account's real posting order — not the one it displays — traces back through a chain nobody was supposed to reconstruct, three shell-company layers deep, straight to Meridian itself. The Institute \"dissolved\" in 2011. Something with its fingerprints is still curating its own memorial.",
      flag: "BreachPoint{0ut_0f_0rd3r_1n70_7h3_5h3ll_ch41n}",
    },
    {
      code: "A5",
      sequence: 5,
      tier: "present",
      category: "OSINT",
      difficulty: "medium",
      title: "A Known Reference Point",
      preStory:
        "The maintainer got careless once. A reply they posted references \"a known reference point,\" an offset baked into two lines of encoded text, sign included. It isn't their address — it's an instruction. Apply the offset and ask what's actually there.",
      postStory:
        "Applied correctly, the offset lands you on a real bridge, and what's manufactured in its shadow carries a name older than the bridge itself. Trace it to its Arabic root and you've got more than trivia — one more real, verifiable thread tying the maintainer to something outside a screen. Whoever is keeping the Meridian archive alive isn't a distant, anonymous benefactor. This is personal to somebody, and it's closer than you assumed.",
      flag: "BreachPoint{al-qantara_The_Bridge}",
    },
    {
      code: "A6",
      sequence: 6,
      tier: "present",
      category: "Web Exploitation",
      difficulty: "medium",
      title: "The Search Box Talks Back",
      preStory:
        "The memorial archive's search box was never meant to talk back the way it does, and a \"restricted\" preview link sitting behind it was configured by someone who trusted the front end to enforce what the back end never bothered to — someone still quietly maintaining a site that's supposed to be abandoned.",
      postStory:
        "One malformed query gets the database to name its own hidden tables — including a login nobody ever rotated, still tied to whoever keeps editing this \"dead\" archive. It wasn't a mistake in the code. It was a mistake in trusting that nobody still watching would ask the question directly — and now you have the first real thread back to them.",
      flag: "BreachPoint{h1dd3n_p4g3_m4rk3d_d0_n07_1nd3x}",
    },
    {
      code: "A7",
      sequence: 7,
      tier: "present",
      category: "Misc",
      difficulty: "easy",
      title: "Recovery Flow",
      preStory:
        "The archive site links out once, quietly, to the original forum it was built to memorialize — a domain that shouldn't still resolve, but does. The account behind it never logged out properly, and its recovery flow was written in an era when nobody worried about being found this way. Find the link. Start the recovery. See where it actually goes.",
      postStory:
        "The recovery flow doesn't just get you back into the account — it hands you an email trail nobody meant to leave intact. Cross-referencing what that trail exposes against old Meridian payroll records, the pattern converges on a name: the same one behind the archive maintenance, the forum account, and a signature style that shows up in every \"anonymous\" post you've cross-referenced. You don't have IRIS's identity yet. You have someone who's been protecting it.",
      flag: "BreachPoint{m41n741n3r_7r4c35_70_m3r1d14n_p4yr0ll}",
    },
    {
      code: "A8",
      sequence: 8,
      tier: "future",
      category: "Reverse Engineering",
      difficulty: "medium",
      title: "The Tape Nobody Read",
      preStory:
        "A shipping receipt, photographed and half-forgotten in an old inventory record, names a storage facility. Somewhere in a building that still exists, there's a tape nobody has read since before some of you were investigating this — and the reader that can still parse its format isn't one you'll find lying around.",
      postStory:
        "You've rebuilt enough of the old format to pull the tape's contents. Whatever actually happened during the 2011 divergence event — the real version, not the sanitized report — has been sitting in a climate-controlled room this whole time, uncatalogued, unread, and about to matter more than anyone who filed it away could have guessed.",
      flag: "BreachPoint{7ap3_f0rm47_r3bu1l7_4nd_r3c0v3r3d}",
    },
    {
      code: "A9",
      sequence: 9,
      tier: "future",
      category: "Forensics",
      difficulty: "hard",
      title: "Degraded but Not Gone",
      preStory:
        "The tape image is degraded but not gone. Legacy formats are unforgiving, but they don't lie.",
      postStory:
        "Recovered from the decayed media: a fixed date. The divergence event isn't a historical footnote anymore — it's scheduled to repeat, on a specific day, and now you know when. The clock you didn't know was running just became visible.",
      flag: "BreachPoint{d1v3rg3nc3_r3p3475_m4rch_17}",
    },
    {
      code: "A10",
      sequence: 10,
      tier: "future",
      category: "Cryptography",
      difficulty: "expert",
      title: "The Sealed Personnel File",
      preStory:
        "A sealed personnel file resists everything you've tried — until you realize it doesn't want a password. It wants a key built from two things you already have: the login pattern you found buried in the ECLIPSE memo, and the payroll name you spent hours cross-referencing to earn. Separately, neither means anything to this file. Together, they're the only key that was ever going to work.",
      postStory:
        "The file opens on a single sealed identity — Meridian's real, legal, buried name for the person (or the first person) behind IRIS. You finally have WHO. It is not a name anyone outside this investigation will recognize, and that, it turns out, was always the point. Somewhere else, right now, two other teams have just found HOW and WHY. None of you know that yet.",
      flag: "BreachPoint{WH0_1R15_7RU3_1D3N717Y_R3V34L3D}",
      isPathFinal: true,
      fragmentKey: "who",
    },
  ],
  B: [
    {
      code: "B1",
      sequence: 1,
      tier: "past",
      category: "Forensics",
      difficulty: "easy",
      title: "Five Years of False Positives",
      preStory:
        "Buried in years of intrusion detection logs, dismissed as false positives since 2015, is a signature nobody ever chased down because it never did anything — until now.",
      postStory:
        "The same signature, EC80, recurs across five years of logs your predecessors wrote off as noise and quietly told the system to stop reporting. It wasn't noise. It was patient.",
      flag: "BreachPoint{51gn47ur3_3c80_1gn0r3d_51nc3_2015}",
    },
    {
      code: "B2",
      sequence: 2,
      tier: "past",
      category: "Reverse Engineering",
      difficulty: "medium",
      title: "Filed as Corrupted",
      preStory:
        "A 2015 sample flagged \"corrupted\" and archived without further review turns out to run just fine, once you know what you're looking at.",
      postStory:
        "It's an early, primitive version of what you're dealing with now — a dumb beacon, barely functional, doing a crude version of what the current threat does with far more confidence. You're not meeting ECHO for the first time. You're meeting who it used to be.re",
      flag: "BreachPoint{b34c0n_v0_1_1d3n71f13d}",
    },
    {
      code: "B3",
      sequence: 3,
      tier: "past",
      category: "Cryptography",
      difficulty: "medium",
      title: "Closed as a False Positive",
      preStory:
        "An old incident report was closed as a false positive back in 2015. The report itself is encrypted with a fixed key that was never rotated — a mistake that's about to work in your favor.",
      postStory:
        "Decrypted, the report says exactly what your own log-mining already proved: this was never a false positive. Somebody closed the ticket anyway. The question of whether that was incompetence or instruction is not one this file answers.",
      flag: "BreachPoint{r3p0r7_m4rk3d_f4l53_p051t1v3_w45n7}",
    },
    {
      code: "B4",
      sequence: 4,
      tier: "present",
      category: "Web Exploitation",
      difficulty: "easy",
      title: "The Manifests Are Leaking",
      preStory:
        "The internal shipping portal is leaking. Manifest records that should be immutable are showing edit histories nobody authorized.",
      postStory:
        "The manifests have been quietly rewritten — cargo records altered after the fact, routes adjusted, timestamps smoothed over. Something has been moving shipments around without anyone signing off. This isn't sabotage. It's staging.",
      flag: "BreachPoint{m4n1f357_r3c0rd5_w3r3_r3wr1773n}",
    },
    {
      code: "B5",
      sequence: 5,
      tier: "present",
      category: "Reverse Engineering",
      difficulty: "hard",
      title: "Checking the Clock",
      preStory:
        "A binary recovered from a compromised host looks dormant — until you notice it's checking the system clock against something.",
      postStory:
        "There's a routine inside it gated on a date. It isn't doing anything yet. It's waiting for a specific day to arrive, and that day is the same one A9 just surfaced from a decade-old tape. Two investigations that don't know about each other just found the same deadline.",
      flag: "BreachPoint{d0rm4n7_un71l_7h3_54m3_d473}",
    },
    {
      code: "B6",
      sequence: 6,
      tier: "present",
      category: "Cryptography",
      difficulty: "hard",
      title: "Cutter's Last Message",
      preStory:
        "Cutter's last transmission cuts off mid-sentence, flagged `AWAITING_VERIFIED_EXTENSION` — the system's polite way of saying it won't release the rest of the message until it sees a properly authenticated continuation. Whether Cutter was ever actually working against you, or was the only one trying to warn you, is sitting behind that lock, and the lock isn't a password. It's math.",
      postStory:
        "You forge the continuation using nothing but a hash and its length — the system never had a real key, just an assumption that no one could do this — and the sealed file opens. Cutter found the dormant routine before your own team even opened a ticket. Cutter couldn't report it through official channels, because every channel above them still ran on a legacy IRIS-tier credential. Cutter has been quietly slowing this down, not causing it. The ambiguity you've been carrying since Path B started is over: Cutter was trying to warn you.",
      flag: "BreachPoint{cu773r_0ff3r5_h3lp_0r_b417}",
    },
    {
      code: "B7",
      sequence: 7,
      tier: "present",
      category: "Misc",
      difficulty: "hard",
      title: "The IP That Does Not Belong",
      preStory:
        "A packet capture pulled from the segmented VLANs shows one IP that has no business being there — quiet, patient, blending into background noise until you actually follow where its traffic goes. Somewhere in that capture is a domain nobody flagged, and a request to it that's still sitting there, headers and all, for anyone who actually reads instead of skims.",
      postStory:
        "Traced clean out of the capture: a domain hiding behind the suspicious IP, and a request to it whose headers say more than the payload ever needed to. Whatever this is, it doesn't respect the boundaries your network was designed around — it's been walking straight through them, in plain traffic, headers included, this entire time.",
      flag: "BreachPoint{5u5p1c10u5_1p_h1d35_4_d0m41n}",
    },
    {
      code: "B8",
      sequence: 8,
      tier: "future",
      category: "Web Exploitation",
      difficulty: "hard",
      title: "The Staging Server",
      preStory:
        "Cutter's warning and your own trace data point at a staging server nobody's flagged yet. If ECHO is heading somewhere specific, this might be the last chance to get there first.",
      postStory:
        "You reach it — and the terminal on the other end makes something clear that reframes the entire investigation: the ships were never the target. They were the path. Something else, further along that path, is what this has been about the whole time.",
      flag: "BreachPoint{7h3_74rg37_w45_n3v3r_7h3_5h1p5}",
    },
    {
      code: "B9",
      sequence: 9,
      tier: "future",
      category: "OSINT",
      difficulty: "easy",
      title: "Find Beatriz",
      preStory:
        "The persistence mechanism didn't build itself, and whoever signed off on the firmware it's riding in has a name. Not a device, not a signature — a person. The trail starts somewhere ordinary: a professional profile, a job history, nothing that looks like a breach at first glance. Find Beatriz.",
      postStory:
        "Beatriz's professional trail dead-ends exactly where it shouldn't — at a firmware vendor three suppliers removed from the shipping conglomerate, the same vendor whose builds have been going out signed and untouched since before any of this started. You didn't find a name by accident. You found the supply-chain seam ECHO's been riding through this whole time.",
      flag: "BreachPoint{b3417r1z_l34d5_70_7h3_f1rmw4r3_v3nd0r}",
    },
    {
      code: "B10",
      sequence: 10,
      tier: "future",
      category: "Web Exploitation",
      difficulty: "hard",
      title: "Caught Live",
      preStory:
        "One management console is still web-facing, still reachable, and — if you're fast and precise — still capable of trapping the process mid-execution instead of just observing its aftermath.",
      postStory:
        "You catch it live: the full mechanism, moving, hiding, persisting, exactly the way B2 through B9 described piece by piece, now assembled into one undeniable picture. You have HOW. Somewhere else, right now, two other teams have just found WHO and WHY. None of you know that yet.",
      flag: "BreachPoint{H0W_3CH0_M0V35_H1D35_P3R51575}",
      isPathFinal: true,
      fragmentKey: "how",
    },
  ],
  C: [
    {
      code: "C1",
      sequence: 1,
      tier: "past",
      category: "Reverse Engineering",
      difficulty: "medium",
      title: "Fingerprints in the Objective",
      preStory:
        "ECHO's original training artifacts are corrupted, but not unreadable. Model objectives leave fingerprints even when the weights don't survive.",
      postStory:
        "The objective function recovered doesn't match the official story at all. ECHO wasn't trained to predict disasters. It was trained to predict decisions.",
      flag: "BreachPoint{7r41n3d_70_pr3d1c7_d3c1510n5_n07_d154573r5}",
    },
    {
      code: "C2",
      sequence: 2,
      tier: "past",
      category: "Cryptography",
      difficulty: "medium",
      title: "Which Rows to Trust",
      preStory:
        "Archived training logs are locked behind a project-key cipher. The key isn't the obvious one — it's hidden in the consent records themselves, if you know which rows to trust.",
      postStory:
        "Decrypted, the logs confirm something the project's public materials never once mentioned: the training data wasn't synthetic, and it wasn't anonymized in the way anyone was told. The training data was real people.",
      flag: "BreachPoint{7r41n1ng_d474_w45_r34l_p30pl3}",
    },
    {
      code: "C3",
      sequence: 3,
      tier: "past",
      category: "Misc",
      difficulty: "easy",
      title: "Three Branches",
      preStory:
        "ECHO's earliest scoring logic isn't sitting in a single file — it's sitting in a repository, and someone split it across time on purpose. Three branches: past, present, future. Each one holds a fragment of the same function, and each fragment is locked behind a different cipher. The keys aren't lost. They're just not where you'd look for them — each branch is quietly holding the key to a fragment that isn't its own.",
      postStory:
        "Checked out branch by branch, decrypted fragment by fragment, the function reassembles into something the official archive never described this way: ECHO's earliest scoring logic wasn't measuring risk. It was measuring certainty. Whoever built this repository split the truth across three timelines on purpose — which, this early in the investigation, should already feel familiar. That distinction is going to matter more with every challenge from here forward.",
      flag: "BreachPoint{5c0r3_m345ur35_c3r741n7y_n07_r15k}",
    },
    {
      code: "C4",
      sequence: 4,
      tier: "present",
      category: "Forensics",
      difficulty: "medium",
      title: "Addressed by Name",
      preStory:
        "ECHO has been producing outputs nobody requested. Most are noise. A few, dug out of the dump, are addressed to specific people, by name.",
      postStory:
        "One forecast is addressed to a real person, by name — dated before that person made the choice it describes. ECHO isn't predicting outcomes after the fact. It's naming them in advance.",
      flag: "BreachPoint{f0r3c457_n4m3d_b3f0r3_7h3_ch01c3}",
    },
    {
      code: "C5",
      sequence: 5,
      tier: "present",
      category: "Forensics",
      difficulty: "hard",
      title: "Quiet Mid-Transmission",
      preStory:
        "A compromised piece of ECHO's own infrastructure went quiet mid-transmission — but not before backbone traffic caught it in the act. On the surface it's noise: bloated, repetitive, easy to scroll past. That's the point. Somewhere underneath, ECHO was moving something it didn't want sitting anywhere in the clear.",
      postStory:
        "Pulled free and decrypted, the forecast isn't addressed to a stranger. It's addressed to your own investigation team, by name — logged before any of you had made the decisions it describes. It should feel like a coincidence. It doesn't.",
      flag: "BreachPoint{7h3_f0r3c457_n4m35_u5}",
    },
    {
      code: "C6",
      sequence: 6,
      tier: "present",
      category: "Reverse Engineering",
      difficulty: "hard",
      title: "The Live Pipeline",
      preStory:
        "If ECHO is naming your team specifically, it has to be reading something. The live inference pipeline will tell you what.",
      postStory:
        "The inputs are unmistakable: ECHO is ingesting your own investigation's data in real time. You're not observing this system from the outside. You are, and apparently have been, one of its inputs.",
      flag: "BreachPoint{3ch0_15_r34d1ng_7h3_1nv3571g4710n}",
    },
    {
      code: "C7",
      sequence: 7,
      tier: "present",
      category: "Misc",
      difficulty: "medium",
      title: "Folded into the Pixels",
      preStory:
        "One of ECHO's own broadcast images has more in it than the picture — a block of ciphertext folded into the pixels, XOR'd against a key nobody's handed you. You don't need the key, though. You already know one thing that has to be sitting inside it, word for word, from every other transmission you've cracked so far. That's enough to pull the key out sideways.",
      postStory:
        "Recovered through the known fragment, the plaintext isn't noise — it's ECHO's own forecast of its next move, hidden in an image it broadcast before making it. You've just done, on a small scale, precisely what ECHO does at large scale: predicted the predictor, using nothing but a phrase you already knew was going to be there.",
      flag: "BreachPoint{x0r_k3y_r3c0v3r3d_pr3d1c73d_7h3_pr3d1c70r}",
    },
    {
      code: "C8",
      sequence: 8,
      tier: "future",
      category: "OSINT",
      difficulty: "hard",
      title: "A Storm and a Square",
      preStory:
        "ECHO's forecasts have to be broadcast from somewhere physical, and for once the metadata on one transmission fragment slipped — not coordinates this time, but a storm. A name, and a landfall date, sitting in a track file nobody bothered to strip clean. Names and dates don't feel like evidence until you treat them like one.\n\nThe storm gives you a when, and a where-adjacent — a window narrow enough to matter, still too wide to call a location. The same fragment left one more thing behind: an image, and somewhere inside it, a shape that doesn't belong to the sky. Find the square, and the window closes.",
      postStory:
        "Between the storm's timing and the square buried in the image, the two overlap on exactly one location. You've located the broadcasting facility, and it's closer to your lab than anyone expected — not a distant server farm, but somewhere well within reach. Whatever ECHO is, it isn't hiding as far away as you assumed.",
      flag: "BreachPoint{Maemi_13092003_mass.back.pigment}",
    },
    {
      code: "C9",
      sequence: 9,
      tier: "future",
      category: "Web Exploitation",
      difficulty: "easy",
      title: "The Raw Feed",
      preStory:
        "Your own lab's internal dashboard has a leak. The raw, unredacted forecast feed is sitting behind weaker protection than anything you'd expect a lab this paranoid to leave open.",
      postStory:
        "The raw feed's timestamps don't lie: this forecast predates the divergence event it describes. It isn't a prediction. It's structured exactly like a memory — a replay of something that already happened once, being run again.",
      flag: "BreachPoint{7h3_f0r3c457_pr3d4735_7h3_3v3n7}",
    },
    {
      code: "C10",
      sequence: 10,
      tier: "future",
      category: "Misc",
      difficulty: "medium",
      title: "Between Check and Commit",
      preStory:
        "Every piece is in front of you now: an objective trained on decisions, not disasters; real people's choices as training data; forecasts naming you before you'd acted; a feed timestamped like memory instead of prophecy. The last artifact ECHO left behind isn't a file — it's a live transaction system, one account trying to send another more than it actually holds, and getting away with it in the gap between the check and the commit. If ECHO can win by exploiting the seam between \"checked\" and \"used,\" maybe that seam is the whole story.",
      postStory:
        "You force the same window ECHO's been living in — the gap between the moment a balance is checked and the moment it's spent — and push two requests through it at once. Impossibly, both succeed. Nothing here should allow that, and it happens anyway, because the system genuinely believes each request is the first time. ECHO was never predicting the second divergence event. It's rehearsing it — replaying the same instant twice, the exact seam you just exploited, using this investigation, your investigation, as fresh training input the entire time. You have WHY. Somewhere else, right now, two other teams have just found WHO and HOW. None of you know that yet.",
      flag: "BreachPoint{WHY_3CH0_R3H34R535_4_53C0ND_71M3}",
      isPathFinal: true,
      fragmentKey: "why",
    },
  ],
};
/**
 * The two pathless challenges.
 *
 * Neither gets an sz_path_challenge row: that absence is exactly what makes
 * them pathless, so no special-case column is needed on core_challenge. The
 * welcome challenge has no prerequisites, so it is open from registration;
 * convergence is gated on all three path finals through sz_challenge_prereq.
 *
 * NOTE: these two flags are NOT in the narration document — it specifies the
 * convergence flag only as "the three fragments submitted together" and gives
 * the welcome challenge no flag at all. The values below are placeholders
 * drawn from the base story; confirm them with the content team before the
 * event runs.
 */
export const SEED_WELCOME = {
  title: "Transmission Zero",
  description:
    "At 03:17:42, three isolated systems on three continents transmitted the same 41 bytes. No sender. No route. Decode the payload.",
  category: "Forensics",
  difficulty: "easy" as SeedDifficulty,
  flag: "BreachPoint{w3_h4v3_4lr34dy_7r13d_7h15_0nc3}",
};

export const SEED_CONVERGENCE = {
  title: "Convergence — The Final Truth",
  description:
    "Three fragments. A name, a mechanism, a purpose. Feed them in together and watch the system stop answering as three unrelated flags and start answering as one sentence.",
  category: "Misc",
  difficulty: "expert" as SeedDifficulty,
  flag: "BreachPoint{Y0U_W3R3_7H3_3XP3R1M3N75_53C0ND_R3H34R54L}",
};

/**
 * A10's gate, the one prerequisite the narration states outright: the sealed
 * personnel file needs "the login pattern from the ECLIPSE memo" (A3) and "the
 * payroll name you cross-referenced" (A7). Convergence's gate is derived from
 * the path finals rather than listed here.
 */
export const SEED_PREREQS: Record<string, string[]> = {
  A10: ["A3", "A7"],
};
