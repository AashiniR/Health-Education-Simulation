/* =============================================================================
   YOUR BRAIN ON AI: LESSON CONTENT
   =============================================================================

   This is the ONLY file you need to edit to change what the website says.
   Every piece of lesson text, every region color, the activity levels, the
   mode captions, the tour order, the quiz questions, the healthy-habit tips
   and the sources all live here.

   -----------------------------------------------------------------------------
   HOW TO EDIT TEXT
   -----------------------------------------------------------------------------
   - Change only the words BETWEEN the double quotes "like this".
   - Keep the quotes, and keep the comma at the end of each line.
   - Apostrophes are fine inside double quotes: "Don't worry."
   - If you need a double quote INSIDE your text, use curly quotes “like this”
     (copy them from here) or put a backslash before it: \"like this\".
   - Save the file. If `npm run dev` is running, the page updates by itself.

   -----------------------------------------------------------------------------
   HOW TO ADD A REGION
   -----------------------------------------------------------------------------
   1. Copy one whole region block below, from its opening { to its closing },
      including the comma after it.
   2. Paste it where you want it in the list. The list order is the order of
      the region list and of the Previous / Next buttons.
   3. Give it a NEW unique `id` (lowercase, words joined with dashes).
   4. Change the name, color and text.
   5. The 3D brain finds the region's shape by its `id`. The built-in brain
      has these shapes you can use as ids:
        "prefrontal-cortex", "frontal-lobe", "parietal-lobe", "temporal-lobe",
        "occipital-lobe", "hippocampus", "cerebellum", "brainstem"
      For example, a region with id "cerebellum" lights up the cerebellum.
      If no shape matches, the region still shows in the list, tour and info
      panel. It just won't light up on the 3D brain, and the browser console
      shows a warning instead of the site crashing.
   6. Add its id to `tourOrder` below if it should be part of the guided tour.

   -----------------------------------------------------------------------------
   HOW TO REMOVE A REGION
   -----------------------------------------------------------------------------
   Delete its whole block, from { to }, including the comma after it.
   The tour, quiz and region list update automatically. Tour steps and quiz
   questions that point at a missing region are skipped. (You can also remove
   its id from `tourOrder` and the quiz to keep things tidy.)

   -----------------------------------------------------------------------------
   ACTIVITY LEVELS
   -----------------------------------------------------------------------------
   Each region has a number from 0 to 1 for each mode:
     0 = completely dim, 0.5 = medium, 1 = fully lit up.
   These control how brightly the region glows when students switch modes.

   ============================================================================= */

// ----------------------------------------------------------------------------
// TYPES. These describe the shape of the content. You normally don't need to
// change anything in this section.
// ----------------------------------------------------------------------------

/** The three simulation modes shown in the toggle at the top. */
export type ModeId = "thinking" | "active" | "passive";

export interface ModeContent {
  id: ModeId;
  /** Full label on the toggle button. */
  label: string;
  /** Shorter label used on small phone screens. */
  shortLabel: string;
  /** The caption shown under the toggle when this mode is on. */
  caption: string;
}

/** An extra heading + paragraph you can add to any region's info panel. */
export interface ExtraSection {
  heading: string;
  text: string;
}

export interface RegionContent {
  /** Unique id: lowercase-with-dashes. Also used to find the 3D shape. */
  id: string;
  /** Name shown everywhere. */
  name: string;
  /** Optional short note about where it is, shown under the name. */
  location?: string;
  /** Highlight color as a hex code, like "#ff7a1a". */
  color: string;
  /** Plain name of the color, for students coloring the paper diagram. */
  colorName: string;
  /**
   * "region" (default) is a part of the brain.
   * "network" is drawn as glowing connection lines between other regions.
   */
  type?: "region" | "network";
  /**
   * Set to true for regions hidden INSIDE the brain (like the hippocampus).
   * The outer brain becomes see-through when this region is selected.
   */
  deep?: boolean;
  whatItDoes: string;
  aiEffect: string;
  /** Optional healthy-AI tip. */
  tryThis?: string;
  /** Optional fun fact. */
  funFact?: string;
  /** Optional extra sections: add as many { heading, text } blocks as you like. */
  extraSections?: ExtraSection[];
  /** Glow level from 0 (dim) to 1 (fully lit) in each mode. */
  activity: Record<ModeId, number>;
  /**
   * Advanced (optional): names of 3D shapes that belong to this region.
   * Leave this out to use the region's id. Useful when you drop in a real
   * brain model whose parts have different names, e.g. ["Hippocampus_L", "Hippocampus_R"].
   */
  meshNames?: string[];
  /** Network only: pairs of region ids to connect with glowing lines. */
  links?: [string, string][];
  /**
   * Advanced (optional): which way the camera looks at this region when it is
   * focused. `direction` is [x, y, z] pointing from the region toward the camera
   * (+x = the brain's left side, +y = up, +z = the front). `distance` is how far
   * away the camera stops (the whole brain fits at about 4.5).
   */
  view?: { direction: [number, number, number]; distance?: number };
}

export type QuizQuestion =
  /** "identify": the app lights up a region and asks "Which region is this?" (4 choices). */
  | { type: "identify"; regionId: string }
  /** "find": the app shows a clue and the student clicks the matching region. */
  | { type: "find"; regionId: string; prompt: string };

export interface Source {
  title: string;
  publisher: string;
  url: string;
  /** Optional: "video", "article", etc. */
  kind?: string;
}

export interface BrainContent {
  site: {
    title: string;
    subtitle: string;
    /** Small label above the title on the landing screen. */
    eyebrow: string;
    /** First-time hint for mouse / trackpad users. */
    hintMouse: string;
    /** First-time hint for touch-screen users. */
    hintTouch: string;
  };
  modes: ModeContent[];
  regions: RegionContent[];
  /** Region ids in the order the guided tour visits them. */
  tourOrder: string[];
  quiz: {
    /** How many questions one round of the quiz asks (picked at random from the list). */
    questionsPerRound: number;
    questions: QuizQuestion[];
  };
  habits: {
    title: string;
    intro: string;
    tips: string[];
  };
  sources: {
    note: string;
    list: Source[];
  };
  /**
   * 3D model settings. Leave `file` as null to use the built-in brain.
   * To use a real brain model, put it at public/models/brain.glb and set
   * file: "/models/brain.glb". See README section "Swapping in a real brain model".
   */
  model: {
    file: string | null;
    /** Rotate the model if it loads facing the wrong way: [x, y, z] in degrees. */
    rotationDegrees: [number, number, number];
  };
}

// ----------------------------------------------------------------------------
// THE CONTENT. Edit below this line.
// ----------------------------------------------------------------------------

export const brainContent: BrainContent = {
  site: {
    title: "Your Brain on AI",
    subtitle:
      "Explore how thinking on your own, using AI as a tool, and copy-pasting from AI change what your brain does.",
    eyebrow: "HOSA Health Education",
    hintMouse: "Drag to rotate, scroll to zoom, click a region to learn more.",
    hintTouch: "Drag to rotate, pinch to zoom, tap a region to learn more.",
  },

  modes: [
    {
      id: "thinking",
      label: "Thinking on your own",
      shortLabel: "On your own",
      caption:
        "Your whole brain is working together: planning, remembering, and using language.",
    },
    {
      id: "active",
      label: "Active AI use",
      shortLabel: "Active AI",
      caption:
        "You're using AI as a tool: questioning it, checking it, and putting answers in your own words. Most of your brain stays engaged.",
    },
    {
      id: "passive",
      label: "Passive AI use (copy-paste)",
      shortLabel: "Passive AI",
      caption:
        "AI is doing the thinking. This is called cognitive offloading. Like relying on GPS can weaken your sense of direction, relying on AI can weaken thinking skills you don't practice.",
    },
  ],

  regions: [
    {
      id: "prefrontal-cortex",
      name: "Prefrontal Cortex",
      location: "Front of the frontal lobe",
      color: "#ff7a1a",
      colorName: "electric orange",
      whatItDoes:
        "Your planning, reasoning, and decision-making center. It helps you focus, solve problems, and control impulses.",
      aiEffect:
        "When you question AI, compare answers, or check its work, this area stays busy. When you just copy and accept answers, it does much less work. Skills you don't practice get weaker over time.",
      tryThis: "Before you ask AI, write down your own first guess.",
      funFact:
        "It is the last part of the brain to finish developing, usually around age 25.",
      activity: { thinking: 1.0, active: 0.85, passive: 0.3 },
    },
    {
      id: "parietal-lobe",
      name: "Parietal Lobe",
      location: "Top and upper back of your head",
      color: "#a970ff",
      colorName: "violet",
      whatItDoes:
        "Processes touch and body position, helps you understand space and direction, and supports attention and working with numbers.",
      aiEffect:
        "Active when you scan AI-generated text, compare information, or analyze data.",
      tryThis: "Read AI answers closely instead of skimming them.",
      activity: { thinking: 0.8, active: 0.7, passive: 0.4 },
    },
    {
      id: "temporal-lobe",
      name: "Temporal Lobe",
      location: "Sides of your head, near your ears",
      color: "#2fd35b",
      colorName: "green",
      whatItDoes:
        "Located on the sides of your head near your ears. Handles language, hearing, memory, and emotions.",
      aiEffect:
        "Works when you read and interpret what AI writes. If you never write or explain ideas in your own words, you get less language practice.",
      tryThis: "Explain the AI's answer out loud or in your own words.",
      activity: { thinking: 0.9, active: 0.75, passive: 0.45 },
    },
    {
      id: "occipital-lobe",
      name: "Occipital Lobe",
      location: "Back of your head",
      color: "#ffc61a",
      colorName: "yellow",
      whatItDoes: "At the back of your head. Processes everything you see.",
      aiEffect:
        "Busy whenever you read a screen, AI or not. Seeing information is not the same as thinking about it.",
      activity: { thinking: 0.7, active: 0.7, passive: 0.65 },
    },
    {
      id: "hippocampus",
      name: "Hippocampus",
      location: "Deep inside the temporal lobe",
      color: "#ff5fa2",
      colorName: "pink",
      deep: true,
      whatItDoes:
        "Helps turn what you experience and learn into long-term memories.",
      aiEffect:
        "Memories stick when you put in effort: researching, struggling with a problem, reflecting. Passively copying AI answers skips that effort, so less gets remembered. In an MIT study, many people who wrote essays with ChatGPT had trouble quoting their own essays afterward.",
      tryThis:
        "After using AI, close it and write down 3 things you learned from memory.",
      activity: { thinking: 1.0, active: 0.7, passive: 0.25 },
    },
    {
      id: "executive-memory-language-network",
      name: "Executive-Memory-Language Network",
      location: "Connections between brain regions",
      color: "#22e5ff",
      colorName: "cyan",
      type: "network",
      whatItDoes:
        "Teams of brain regions that pass information back and forth so you can think, remember, and communicate.",
      aiEffect:
        "In a 2025 MIT Media Lab study, people who wrote essays with ChatGPT showed weaker connections between brain regions than people who wrote on their own. This is early research with a small group of adults, but it suggests that letting AI do the work means your brain coordinates less.",
      tryThis:
        "Use AI as a tutor (“explain this step,” “quiz me”), not an answer machine.",
      activity: { thinking: 1.0, active: 0.75, passive: 0.3 },
      links: [
        ["prefrontal-cortex", "temporal-lobe"],
        ["prefrontal-cortex", "parietal-lobe"],
        ["prefrontal-cortex", "hippocampus"],
        ["temporal-lobe", "parietal-lobe"],
        ["temporal-lobe", "hippocampus"],
        ["parietal-lobe", "hippocampus"],
      ],
    },
  ],

  tourOrder: [
    "prefrontal-cortex",
    "parietal-lobe",
    "temporal-lobe",
    "occipital-lobe",
    "hippocampus",
    "executive-memory-language-network",
  ],

  quiz: {
    questionsPerRound: 7,
    questions: [
      { type: "identify", regionId: "prefrontal-cortex" },
      { type: "identify", regionId: "parietal-lobe" },
      { type: "identify", regionId: "temporal-lobe" },
      { type: "identify", regionId: "occipital-lobe" },
      { type: "identify", regionId: "hippocampus" },
      {
        type: "find",
        regionId: "prefrontal-cortex",
        prompt: "Find the planning, reasoning, and decision-making center.",
      },
      {
        type: "find",
        regionId: "hippocampus",
        prompt:
          "Find the region that helps turn what you learn into long-term memories.",
      },
      {
        type: "find",
        regionId: "occipital-lobe",
        prompt: "Find the region that processes everything you see.",
      },
      {
        type: "find",
        regionId: "temporal-lobe",
        prompt:
          "Find the region near your ears that handles language, hearing, memory, and emotions.",
      },
      {
        type: "find",
        regionId: "parietal-lobe",
        prompt:
          "Find the region that helps you understand space and direction and work with numbers.",
      },
    ],
  },

  habits: {
    title: "Healthy AI habits",
    intro: "Use AI so your brain keeps doing the work:",
    tips: [
      "Before you ask AI, write down your own first guess.",
      "Read AI answers closely instead of skimming them.",
      "Question AI and check its work. Compare its answer with another source.",
      "Explain the AI's answer out loud or in your own words.",
      "After using AI, close it and write down 3 things you learned from memory.",
      "Use AI as a tutor (“explain this step,” “quiz me”), not an answer machine.",
    ],
  },

  sources: {
    note: "Research on AI and the brain is new and still developing.",
    list: [
      {
        title: "Your Brain on ChatGPT",
        publisher: "MIT Media Lab",
        url: "https://www.media.mit.edu/publications/your-brain-on-chatgpt/",
        kind: "research",
      },
      {
        title: "AI, job skills, and thinking",
        publisher: "American Psychological Association, Monitor on Psychology",
        url: "https://www.apa.org/monitor/2026/07-08/ai-job-skills-thinking",
        kind: "article",
      },
      {
        title: "What AI does to your brain",
        publisher: "Britannica",
        url: "https://www.britannica.com/video/what-ai-does-to-your-brain-video/-367968",
        kind: "video",
      },
      {
        title: "Parietal Lobe",
        publisher: "Cleveland Clinic",
        url: "https://my.clevelandclinic.org/health/body/24628-parietal-lobe",
        kind: "article",
      },
      {
        title: "Occipital Lobe: What to Know",
        publisher: "WebMD",
        url: "https://www.webmd.com/brain/occipital-lobe-what-to-know",
        kind: "article",
      },
    ],
  },

  model: {
    file: null,
    rotationDegrees: [0, 0, 0],
  },
};
