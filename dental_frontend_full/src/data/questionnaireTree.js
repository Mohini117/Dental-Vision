// Rule-based symptom questionnaire.
// No model/LLM involved — this is a plain decision tree: each question node
// has a list of options, each option points to either another question id
// or a terminal result id. Purely deterministic branching logic.

export const START_ID = "q_main";

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
      { label: "Yes", next: "result_cavity_likely" },
      { label: "No", next: "result_sensitivity_general" },
    ],
  },
  q_pain_severe: {
    prompt: "Is there any swelling on your face or gum near that tooth?",
    options: [
      { label: "Yes", next: "result_urgent_infection" },
      { label: "No", next: "result_cavity_advanced" },
    ],
  },
  q_pain_bite: {
    prompt: "Is it a tooth with an old filling, crown, or visible crack?",
    options: [
      { label: "Yes", next: "result_cracked_or_filling" },
      { label: "No", next: "result_bite_general" },
    ],
  },

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
      { label: "Just the last few days", next: "result_gingivitis_early" },
      { label: "More than a few weeks", next: "result_gingivitis_established" },
      { label: "Gums are receding or teeth feel loose", next: "result_urgent_periodontal" },
    ],
  },
  q_gum_swollen_only: {
    prompt: "Do you notice hard, yellowish deposits near the gumline?",
    options: [
      { label: "Yes", next: "result_calculus" },
      { label: "No", next: "result_gum_general" },
    ],
  },

  q_breath: {
    prompt: "Do you notice visible plaque or tartar buildup on your teeth?",
    options: [
      { label: "Yes", next: "result_calculus" },
      { label: "No", next: "result_breath_general" },
    ],
  },

  q_stain: {
    prompt: "Are the stains mostly dark/black, or yellow/brown?",
    options: [
      { label: "Dark or black", next: "result_stain_dark" },
      { label: "Yellow or brown", next: "result_stain_general" },
    ],
  },

  q_ulcer: {
    prompt: "How long has the sore been present?",
    options: [
      { label: "Less than 2 weeks", next: "result_ulcer_common" },
      { label: "More than 2 weeks", next: "result_urgent_ulcer" },
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
    title: "Possible cavity",
    matchedCondition: "Cavity Or Decay",
    description:
      "Sensitivity paired with a visible spot or hole is a common sign of a cavity that has started to form.",
    recommendation:
      "Run the AI photo screening on this tooth, and plan a dentist visit for a proper filling evaluation.",
    suggestScan: true,
  },
  result_sensitivity_general: {
    urgency: "low",
    title: "General tooth sensitivity",
    matchedCondition: null,
    description:
      "Sensitivity without a visible spot is often caused by worn enamel or gum recession, not necessarily a cavity.",
    recommendation:
      "Try a sensitivity toothpaste for 2 weeks. If it doesn't improve, see a dentist to check for other causes.",
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
      "Occasional discomfort when biting can come from minor gum inflammation or a recently adjusted bite.",
    recommendation:
      "Monitor it for a week. If it continues or worsens, see a dentist.",
    suggestScan: true,
  },

  result_gingivitis_early: {
    urgency: "moderate",
    title: "Early gum inflammation",
    matchedCondition: "Gingivitis",
    description:
      "Recent bleeding when brushing is a classic early sign of gingivitis, and is usually reversible.",
    recommendation:
      "Improve brushing/flossing consistency for 2 weeks. Run the AI screening to check for visible signs.",
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
      "Bad breath without visible buildup is often related to diet, dry mouth, or brushing habits.",
    recommendation:
      "Stay hydrated, clean your tongue when brushing, and see a dentist if it doesn't improve.",
    suggestScan: false,
  },

  result_stain_dark: {
    urgency: "moderate",
    title: "Dark surface staining",
    matchedCondition: "Tooth Discoloration",
    description:
      "Dark or black surface stains are often from tannins (tea/coffee), tobacco, or certain bacteria, though they're usually cosmetic.",
    recommendation:
      "Run the AI screening, and consider a professional cleaning to assess and remove the staining.",
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

  result_ulcer_common: {
    urgency: "low",
    title: "Likely common mouth ulcer",
    matchedCondition: "Ulcers",
    description:
      "Most mouth ulcers under 2 weeks old are minor (canker sores) and heal on their own.",
    recommendation:
      "Try a salt-water rinse a few times a day. It should heal within 1–2 weeks.",
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