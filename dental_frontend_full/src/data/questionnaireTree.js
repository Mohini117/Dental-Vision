// Rule-based symptom questionnaire.
// No model/LLM involved — this is a plain decision tree: each question node
// has a list of options, each option points to either another question id
// or a terminal result id. Purely deterministic branching logic.
// A small keyword router (see KEYWORD_ROUTES) lets a free-text chat message
// jump straight into the relevant branch instead of always starting at the
// top-level menu.

export const START_ID = "q_main";

// Free-text keyword routing for the chat interface. First match wins.
// This is plain string matching — no NLP/LLM involved.
export const KEYWORD_ROUTES = [
  {
    keywords: ["pain", "hurt", "ache", "sensitive", "sensitivity", "sting"],
    next: "q_pain",
    reply: "Sorry to hear that — let's narrow down what's causing it.",
  },
  {
    keywords: ["bleed", "gum", "swollen", "swelling", "puffy"],
    next: "q_gum",
    reply: "Let's take a closer look at your gums.",
  },
  {
    keywords: ["breath", "smell", "odor", "odour", "taste"],
    next: "q_breath",
    reply: "Let's figure out what might be causing that.",
  },
  {
    keywords: ["stain", "discolor", "discolour", "yellow", "black spot", "white spot"],
    next: "q_stain",
    reply: "Let's check what kind of staining you're seeing.",
  },
  {
    keywords: ["ulcer", "sore", "blister", "canker", "wound"],
    next: "q_ulcer",
    reply: "Let's check that sore in your mouth.",
  },
];

export const QUESTIONS = {
  q_main: {
    prompt: "What's your main concern today?",
    options: [
      { label: "Tooth pain or sensitivity", next: "q_pain" },
      { label: "Bleeding or swollen gums", next: "q_gum" },
      { label: "Bad breath or bad taste", next: "q_breath" },
      { label: "Discoloration or stains on teeth", next: "q_stain" },
      { label: "A sore or ulcer in my mouth", next: "q_ulcer" },
      { label: "Just a routine check", next: "result_routine" },
    ],
  },

  // ---- Pain branch ----
  q_pain: {
    prompt: "When does the pain happen?",
    options: [
      { label: "With cold, hot, or sweet food", next: "q_pain_sensitivity" },
      { label: "Constant, throbbing pain", next: "q_pain_severe" },
      { label: "Only when biting down", next: "q_pain_bite" },
    ],
  },
  q_pain_sensitivity: {
    prompt: "Do you see any visible dark spot or hole on the tooth?",
    options: [
      { label: "Yes", next: "q_pain_sensitivity_duration" },
      { label: "No", next: "q_pain_sensitivity_duration_general" },
    ],
  },
  q_pain_sensitivity_duration: {
    prompt: "How long has this spot or sensitivity been there?",
    options: [
      { label: "Just noticed it recently", next: "result_cavity_likely" },
      { label: "Several weeks or more", next: "result_cavity_established" },
    ],
  },
  q_pain_sensitivity_duration_general: {
    prompt: "Is the sensitivity new, or has it been happening for a while?",
    options: [
      { label: "New, just started", next: "result_sensitivity_general" },
      { label: "Ongoing for weeks or months", next: "result_sensitivity_chronic" },
    ],
  },
  q_pain_severe: {
    prompt: "Is there any swelling on your face or gum near that tooth?",
    options: [
      { label: "Yes", next: "q_pain_severe_fever" },
      { label: "No", next: "result_cavity_advanced" },
    ],
  },
  q_pain_severe_fever: {
    prompt: "Do you also have a fever or feel generally unwell?",
    options: [
      { label: "Yes", next: "result_urgent_infection_fever" },
      { label: "No", next: "result_urgent_infection" },
    ],
  },
  q_pain_bite: {
    prompt: "Is it a tooth with an old filling, crown, or visible crack?",
    options: [
      { label: "Yes", next: "result_cracked_or_filling" },
      { label: "No", next: "q_pain_bite_duration" },
    ],
  },
  q_pain_bite_duration: {
    prompt: "How long has biting felt uncomfortable?",
    options: [
      { label: "Just the last day or two", next: "result_bite_general" },
      { label: "More than a week", next: "result_bite_persistent" },
    ],
  },

  // ---- Gum branch ----
  q_gum: {
    prompt: "Do your gums bleed when you brush or floss?",
    options: [
      { label: "Yes", next: "q_gum_bleed_duration" },
      { label: "No, just look swollen", next: "q_gum_swollen_only" },
    ],
  },
  q_gum_bleed_duration: {
    prompt: "How long has this been happening?",
    options: [
      { label: "Just the last few days", next: "q_gum_bleed_habits" },
      { label: "More than a few weeks", next: "q_gum_bleed_habits_established" },
      { label: "Gums are receding or teeth feel loose", next: "result_urgent_periodontal" },
    ],
  },
  q_gum_bleed_habits: {
    prompt: "How often do you brush and floss currently?",
    options: [
      { label: "Twice a day, rarely floss", next: "result_gingivitis_early" },
      { label: "Irregularly, less than once a day", next: "result_gingivitis_early_hygiene" },
    ],
  },
  q_gum_bleed_habits_established: {
    prompt: "Do you smoke, or have diabetes?",
    options: [
      { label: "Yes, one or both", next: "result_gingivitis_risk" },
      { label: "No", next: "result_gingivitis_established" },
    ],
  },
  q_gum_swollen_only: {
    prompt: "Do you notice hard, yellowish deposits near the gumline?",
    options: [
      { label: "Yes", next: "result_calculus" },
      { label: "No", next: "result_gum_general" },
    ],
  },

  // ---- Breath branch ----
  q_breath: {
    prompt: "Do you notice visible plaque or tartar buildup on your teeth?",
    options: [
      { label: "Yes", next: "result_calculus" },
      { label: "No", next: "q_breath_dry" },
    ],
  },
  q_breath_dry: {
    prompt: "Does your mouth often feel dry?",
    options: [
      { label: "Yes", next: "result_breath_dry" },
      { label: "No", next: "result_breath_general" },
    ],
  },

  // ---- Stain branch ----
  q_stain: {
    prompt: "Are the stains mostly dark/black, or yellow/brown?",
    options: [
      { label: "Dark or black", next: "q_stain_dark_habit" },
      { label: "Yellow or brown", next: "q_stain_general_habit" },
    ],
  },
  q_stain_dark_habit: {
    prompt: "Do you smoke, chew tobacco, or drink a lot of tea/coffee?",
    options: [
      { label: "Yes", next: "result_stain_dark_habit" },
      { label: "No", next: "result_stain_dark" },
    ],
  },
  q_stain_general_habit: {
    prompt: "Do you drink a lot of tea, coffee, or red wine?",
    options: [
      { label: "Yes", next: "result_stain_general_habit" },
      { label: "No", next: "result_stain_general" },
    ],
  },

  // ---- Ulcer branch ----
  q_ulcer: {
    prompt: "How long has the sore been present?",
    options: [
      { label: "Less than 2 weeks", next: "q_ulcer_common_count" },
      { label: "More than 2 weeks", next: "result_urgent_ulcer" },
    ],
  },
  q_ulcer_common_count: {
    prompt: "Is it a single sore, or several at once?",
    options: [
      { label: "A single sore", next: "result_ulcer_common" },
      { label: "Several at once", next: "result_ulcer_multiple" },
    ],
  },
};

// urgency: "low" | "moderate" | "high" — drives the badge color only.
// matchedCondition is a loose label for what this maps to conceptually —
// it is NOT a model prediction, just consistent terminology with the
// screening feature's own condition vocabulary.
export const RESULTS = {
  result_routine: {
    urgency: "low",
    title: "No specific concern reported",
    matchedCondition: null,
    description:
      "You didn't flag a particular symptom. A routine dental check every 6 months is still the best way to catch anything early.",
    recommendation:
      "Consider a routine cleaning and checkup if it's been more than 6 months since your last visit.",
    suggestScan: true,
  },

  result_cavity_likely: {
    urgency: "moderate",
    title: "Possible early cavity",
    matchedCondition: "Cavity Or Decay",
    description:
      "A recently noticed spot with sensitivity is a common sign a cavity has just started forming.",
    recommendation:
      "Run the AI photo screening on this tooth, and plan a dentist visit for a filling evaluation before it progresses.",
    suggestScan: true,
  },
  result_cavity_established: {
    urgency: "moderate",
    title: "Possible established cavity",
    matchedCondition: "Cavity Or Decay",
    description:
      "A visible spot that's been there for weeks has likely progressed further into the tooth.",
    recommendation:
      "Run the AI screening and don't delay a dentist visit — the sooner this is filled, the simpler the treatment.",
    suggestScan: true,
  },
  result_sensitivity_general: {
    urgency: "low",
    title: "New tooth sensitivity",
    matchedCondition: null,
    description:
      "New sensitivity without a visible spot is often from worn enamel or minor gum recession.",
    recommendation:
      "Try a sensitivity toothpaste for 2 weeks. If it doesn't improve, see a dentist to check for other causes.",
    suggestScan: true,
  },
  result_sensitivity_chronic: {
    urgency: "moderate",
    title: "Ongoing tooth sensitivity",
    matchedCondition: null,
    description:
      "Sensitivity that's persisted for weeks or months is worth a proper dental check, even without a visible spot.",
    recommendation:
      "Run the AI screening, and see a dentist to check for early decay, enamel wear, or gum recession.",
    suggestScan: true,
  },

  result_urgent_infection: {
    urgency: "high",
    title: "Possible dental infection",
    matchedCondition: null,
    description:
      "Throbbing pain with facial or gum swelling can indicate an abscess or infection, which can worsen quickly.",
    recommendation:
      "This needs a dentist's attention soon — please don't wait on this one. A photo screening isn't a substitute here.",
    suggestScan: false,
  },
  result_urgent_infection_fever: {
    urgency: "high",
    title: "Possible spreading infection",
    matchedCondition: null,
    description:
      "Swelling combined with fever or feeling unwell can mean an infection is starting to spread beyond the tooth.",
    recommendation:
      "Please seek dental or medical care promptly — this combination shouldn't wait for a routine appointment.",
    suggestScan: false,
  },
  result_cavity_advanced: {
    urgency: "moderate",
    title: "Possible deeper decay",
    matchedCondition: "Cavity Or Decay",
    description:
      "Constant pain without swelling can still mean decay has reached deeper into the tooth.",
    recommendation:
      "Run the AI photo screening and plan a dentist visit — deeper decay is best treated before it progresses further.",
    suggestScan: true,
  },

  result_cracked_or_filling: {
    urgency: "moderate",
    title: "Possible cracked tooth or filling issue",
    matchedCondition: null,
    description:
      "Pain only on biting, especially around an old filling or crown, often points to a mechanical issue rather than new decay.",
    recommendation:
      "This is best evaluated in person — a crack or a failing filling isn't always visible in a photo.",
    suggestScan: false,
  },
  result_bite_general: {
    urgency: "low",
    title: "Mild bite sensitivity",
    matchedCondition: null,
    description:
      "Brief discomfort when biting can come from minor gum inflammation or a recently adjusted bite.",
    recommendation:
      "Monitor it for a week. If it continues or worsens, see a dentist.",
    suggestScan: true,
  },
  result_bite_persistent: {
    urgency: "moderate",
    title: "Persistent bite discomfort",
    matchedCondition: null,
    description:
      "Discomfort on biting that's lasted over a week is less likely to resolve on its own.",
    recommendation:
      "Run the AI screening and see a dentist — this could be a developing crack, high filling, or nerve irritation.",
    suggestScan: true,
  },

  result_gingivitis_early: {
    urgency: "moderate",
    title: "Early gum inflammation",
    matchedCondition: "Gingivitis",
    description:
      "Recent bleeding when brushing is a classic early sign of gingivitis, and is usually fully reversible.",
    recommendation:
      "Add flossing daily on top of your current brushing for 2 weeks. Run the AI screening to check for visible signs.",
    suggestScan: true,
  },
  result_gingivitis_early_hygiene: {
    urgency: "moderate",
    title: "Gum inflammation likely from hygiene gaps",
    matchedCondition: "Gingivitis",
    description:
      "Irregular brushing lets plaque build up along the gumline, which is a very common and reversible cause of bleeding gums.",
    recommendation:
      "Aim for brushing twice daily and flossing once daily for 2 weeks — this alone often resolves early gingivitis. Run the AI screening too.",
    suggestScan: true,
  },
  result_gingivitis_established: {
    urgency: "moderate",
    title: "Ongoing gum inflammation",
    matchedCondition: "Gingivitis",
    description:
      "Bleeding gums over several weeks suggest gingivitis that hasn't resolved on its own.",
    recommendation:
      "A professional cleaning is recommended. Run the AI screening and plan a dentist visit.",
    suggestScan: true,
  },
  result_gingivitis_risk: {
    urgency: "moderate",
    title: "Gum inflammation with added risk factors",
    matchedCondition: "Gingivitis",
    description:
      "Smoking and diabetes both make gum disease progress faster and heal more slowly, so this is worth addressing sooner rather than later.",
    recommendation:
      "Run the AI screening and see a dentist soon — mention these factors so they can tailor your care plan.",
    suggestScan: true,
  },
  result_urgent_periodontal: {
    urgency: "high",
    title: "Possible periodontal disease",
    matchedCondition: "Gingivitis",
    description:
      "Receding gums or loose teeth can indicate the inflammation has progressed beyond the gumline into the supporting bone.",
    recommendation:
      "Please see a dentist soon — this stage is best managed before more support is lost.",
    suggestScan: true,
  },

  result_calculus: {
    urgency: "moderate",
    title: "Possible tartar (calculus) buildup",
    matchedCondition: "Calculus",
    description:
      "Hard yellowish deposits near the gumline are hardened plaque (tartar), which can't be removed by brushing alone.",
    recommendation:
      "A professional cleaning is the only way to remove it. Run the AI screening to see the affected areas.",
    suggestScan: true,
  },
  result_gum_general: {
    urgency: "low",
    title: "Mild gum irritation",
    matchedCondition: null,
    description:
      "Swelling without bleeding or visible buildup is often mild and temporary irritation.",
    recommendation:
      "Keep up regular brushing and flossing. Mention it at your next dental visit if it persists.",
    suggestScan: true,
  },
  result_breath_general: {
    urgency: "low",
    title: "General oral hygiene",
    matchedCondition: null,
    description:
      "Bad breath without visible buildup or dryness is often related to diet or brushing habits.",
    recommendation:
      "Stay hydrated, clean your tongue when brushing, and see a dentist if it doesn't improve.",
    suggestScan: false,
  },
  result_breath_dry: {
    urgency: "low",
    title: "Dry mouth-related breath",
    matchedCondition: null,
    description:
      "A dry mouth reduces saliva, which normally helps wash away odor-causing bacteria.",
    recommendation:
      "Try sipping water regularly and consider a dry-mouth rinse. Mention it to a dentist if it's frequent.",
    suggestScan: false,
  },

  result_stain_dark: {
    urgency: "moderate",
    title: "Dark surface staining",
    matchedCondition: "Tooth Discoloration",
    description:
      "Dark or black surface stains can come from certain bacteria or minerals, though they're usually cosmetic.",
    recommendation:
      "Run the AI screening, and consider a professional cleaning to assess and remove the staining.",
    suggestScan: true,
  },
  result_stain_dark_habit: {
    urgency: "moderate",
    title: "Dark staining linked to habits",
    matchedCondition: "Tooth Discoloration",
    description:
      "Tobacco and dark beverages are a very common cause of dark surface stains, and they build up gradually over time.",
    recommendation:
      "A professional cleaning will remove most of it. Cutting back on the habit will slow it from returning. Run the AI screening too.",
    suggestScan: true,
  },
  result_stain_general: {
    urgency: "low",
    title: "Yellow/brown discoloration",
    matchedCondition: "Tooth Discoloration",
    description:
      "Yellow or brown discoloration is commonly related to diet, aging, or enamel thinning.",
    recommendation:
      "This is usually cosmetic. A whitening consult with a dentist can go over safe options.",
    suggestScan: true,
  },
  result_stain_general_habit: {
    urgency: "low",
    title: "Diet-related discoloration",
    matchedCondition: "Tooth Discoloration",
    description:
      "Tea, coffee, and red wine are common, gradual causes of yellow-brown staining on enamel.",
    recommendation:
      "Rinsing with water after these drinks helps. A whitening consult can address existing staining.",
    suggestScan: true,
  },

  result_ulcer_common: {
    urgency: "low",
    title: "Likely common mouth ulcer",
    matchedCondition: "Ulcers",
    description:
      "A single sore under 2 weeks old is usually a minor canker sore, which heals on its own.",
    recommendation:
      "Try a salt-water rinse a few times a day. It should heal within 1–2 weeks.",
    suggestScan: true,
  },
  result_ulcer_multiple: {
    urgency: "moderate",
    title: "Multiple mouth sores",
    matchedCondition: "Ulcers",
    description:
      "Several sores appearing at once is less typical of a simple canker sore and can sometimes point to a viral cause or another trigger.",
    recommendation:
      "If they don't improve within a week, or you develop fever, please see a dentist or doctor.",
    suggestScan: true,
  },
  result_urgent_ulcer: {
    urgency: "high",
    title: "Persistent mouth sore",
    matchedCondition: "Ulcers",
    description:
      "A sore lasting longer than 2 weeks doesn't fit the usual pattern for a minor ulcer and should be checked in person.",
    recommendation:
      "Please see a dentist to have this evaluated directly — persistent sores are worth a professional look.",
    suggestScan: false,
  },
};