export const INTENT_PROMPTS = {
  Quiz: [
    {
      label: 'Make it harder',
      prompts: [
        'Increase the difficulty of the {topic} quiz with higher-order thinking questions',
        'Add analysis and application questions to the {topic} quiz',
        'Include Bloom\'s levels 4–6 in the quiz on {topic}',
        'Make the questions more rigorous for the {topic} quiz',
      ],
    },
    {
      label: 'Scaffold it',
      prompts: [
        'Add scaffolding hints to each question on {topic}',
        'Include sentence starters and vocabulary support in the {topic} quiz',
        'Break down complex questions about {topic} with guiding prompts',
        'Add context clues to support struggling learners on {topic}',
      ],
    },
    {
      label: 'Focus on vocab',
      prompts: [
        'Focus the quiz on key vocabulary and terms for {topic}',
        'Add vocabulary matching questions about {topic}',
        'Make the quiz primarily about defining and using terms from {topic}',
      ],
    },
    {
      label: 'Check comprehension',
      prompts: [
        'Create recall and comprehension questions to check basic understanding of {topic}',
        'Focus the quiz on who, what, when, and where questions about {topic}',
        'Make it a low-stakes comprehension check on {topic}',
      ],
    },
  ],

  Presentation: [
    {
      label: 'Hook the class',
      prompts: [
        'Add an engaging hook slide that sparks curiosity about {topic}',
        'Start the presentation with a thought-provoking question about {topic}',
        'Open with a surprising fact or statistic about {topic}',
      ],
    },
    {
      label: 'Make it interactive',
      prompts: [
        'Add discussion stops and think-pair-share moments throughout the {topic} presentation',
        'Include 2–3 interactive slide prompts for {topic}',
        'Add student reflection slides to the {topic} presentation',
      ],
    },
    {
      label: 'Simplify slides',
      prompts: [
        'Make the {topic} slides more concise — one idea per slide',
        'Reduce text and use bullet points for the {topic} presentation',
        'Simplify the language and layout of the {topic} slides',
      ],
    },
    {
      label: 'Add discussion',
      prompts: [
        'Add a class discussion slide with guiding questions about {topic}',
        'Include a Socratic seminar prompt slide for {topic}',
        'Add a closing discussion activity for {topic}',
      ],
    },
  ],

  'Lesson Plan': [
    {
      label: 'Add differentiation',
      prompts: [
        'Add differentiation strategies for ELL and IEP students in the {topic} lesson',
        'Include tiered activities for different learning levels in the {topic} lesson plan',
        'Add extension activities for advanced learners studying {topic}',
      ],
    },
    {
      label: 'Include assessment',
      prompts: [
        'Add a formative assessment to check for understanding during the {topic} lesson',
        'Include an exit ticket at the end of the {topic} lesson plan',
        'Add both formative and summative assessment checkpoints for {topic}',
      ],
    },
    {
      label: 'Warm-up ideas',
      prompts: [
        'Add a 5-minute warm-up activity to open the {topic} lesson',
        'Include a do-now or bell ringer for the {topic} lesson plan',
        'Start the {topic} lesson with an activating strategy',
      ],
    },
    {
      label: 'Close the lesson',
      prompts: [
        'Add a strong closure activity to end the {topic} lesson',
        'Include a summarizing strategy at the end of the {topic} lesson plan',
        'Add a student reflection prompt to close the {topic} lesson',
      ],
    },
  ],

  Syllabus: [
    {
      label: 'Add objectives',
      prompts: [
        'Include clear learning objectives for each unit in the {topic} syllabus',
        'Add standards-aligned goals to the {topic} syllabus',
        'List measurable learning outcomes for the {topic} course',
      ],
    },
    {
      label: 'Grading breakdown',
      prompts: [
        'Add a detailed grading policy and breakdown to the {topic} syllabus',
        'Include assessment weights and grading criteria in the {topic} syllabus',
        'Add a grade scale and late work policy to the {topic} syllabus',
      ],
    },
    {
      label: 'Week-by-week',
      prompts: [
        'Create a week-by-week pacing guide for {topic}',
        'Add a calendar view of topics and assignments for the {topic} syllabus',
        'Break the {topic} syllabus into a unit-by-unit schedule',
      ],
    },
    {
      label: 'Parent-friendly',
      prompts: [
        'Rewrite the {topic} syllabus in plain language for parents and families',
        'Add a family-facing overview section to the {topic} syllabus',
        'Make the {topic} syllabus accessible and welcoming for families',
      ],
    },
  ],

  Rubric: [
    {
      label: 'Add criteria',
      prompts: [
        'Add 4–5 clear evaluation criteria to the {topic} rubric',
        'Include content, organization, and mechanics as criteria in the {topic} rubric',
        'Break down the {topic} rubric into specific, observable criteria',
      ],
    },
    {
      label: 'More detail',
      prompts: [
        'Expand each rubric level with more specific descriptors for {topic}',
        'Add behavioral anchors to each performance level in the {topic} rubric',
        'Make each scoring level more descriptive for {topic}',
      ],
    },
    {
      label: 'Standards-aligned',
      prompts: [
        'Align the {topic} rubric to specific grade-level standards',
        'Add standard codes to each criterion in the {topic} rubric',
        'Map the {topic} rubric criteria to CCSS or state standards',
      ],
    },
    {
      label: 'Student-friendly',
      prompts: [
        'Rewrite the {topic} rubric in student-friendly language',
        'Simplify the rubric descriptors so students can self-assess on {topic}',
        'Add an "I can" statement format to the {topic} rubric',
      ],
    },
  ],

  'Guided Notes': [
    {
      label: 'Add visuals',
      prompts: [
        'Add diagram labels and visual organizers to the {topic} guided notes',
        'Include space for sketches or diagrams in the {topic} notes',
        'Add a concept map section to the {topic} guided notes',
      ],
    },
    {
      label: 'Scaffold vocab',
      prompts: [
        'Add a vocabulary section with blanks to fill in for {topic}',
        'Include a word bank to support key terms in the {topic} guided notes',
        'Add definition prompts for key vocabulary in {topic}',
      ],
    },
    {
      label: 'Add examples',
      prompts: [
        'Include worked examples and practice problems in the {topic} guided notes',
        'Add 2–3 example problems with space for student work on {topic}',
        'Include a model example section in the {topic} guided notes',
      ],
    },
    {
      label: 'Check understanding',
      prompts: [
        'Add comprehension check questions throughout the {topic} guided notes',
        'Include reflection prompts at the end of each section for {topic}',
        'Add self-check questions to the {topic} guided notes',
      ],
    },
  ],

  'Unit Plan': [
    {
      label: 'Add objectives',
      prompts: [
        'Add standards-aligned learning objectives to the {topic} unit plan',
        'Include essential questions for the {topic} unit',
        'List measurable outcomes for each week of the {topic} unit',
      ],
    },
    {
      label: 'Assessment plan',
      prompts: [
        'Add formative and summative assessments to the {topic} unit plan',
        'Include an assessment calendar for the {topic} unit',
        'Add pre-, mid-, and post-assessments to the {topic} unit plan',
      ],
    },
    {
      label: 'Differentiate',
      prompts: [
        'Add differentiation strategies for diverse learners in the {topic} unit',
        'Include ELL and IEP accommodations in the {topic} unit plan',
        'Add extension tasks for advanced students in the {topic} unit',
      ],
    },
    {
      label: 'Pacing guide',
      prompts: [
        'Create a day-by-day pacing guide for the {topic} unit',
        'Add a week-by-week schedule to the {topic} unit plan',
        'Map out the sequence of lessons for {topic}',
      ],
    },
  ],

  'DOK Questions': [
    {
      label: 'Higher DOK',
      prompts: [
        'Add DOK level 3 and 4 questions for {topic}',
        'Include strategic thinking and extended thinking questions about {topic}',
        'Push toward deeper analysis with DOK 3–4 prompts for {topic}',
      ],
    },
    {
      label: 'Mix levels',
      prompts: [
        'Create a mix of DOK 1–4 questions about {topic}',
        'Include recall, skill, strategic, and extended thinking questions for {topic}',
        'Balance all four DOK levels in the {topic} question set',
      ],
    },
    {
      label: 'Text-based',
      prompts: [
        'Create text-dependent DOK questions for {topic}',
        'Add evidence-based DOK questions tied to a reading about {topic}',
        'Ground the DOK questions in specific text passages about {topic}',
      ],
    },
  ],
};

export const GENERIC_CHIPS = [
  {
    label: 'Make it shorter',
    prompts: [
      'Make the {topic} content more concise and focused',
      'Trim {topic} to the most essential ideas',
      'Reduce the length while keeping the key points for {topic}',
    ],
  },
  {
    label: 'Differentiate it',
    prompts: [
      'Add differentiation options for diverse learners studying {topic}',
      'Include scaffolded and extension versions for {topic}',
      'Adapt {topic} for different learning needs and levels',
    ],
  },
  {
    label: 'Add examples',
    prompts: [
      'Include real-world examples and scenarios for {topic}',
      'Add 2–3 concrete examples to illustrate {topic}',
      'Show how {topic} connects to students\' everyday lives',
    ],
  },
  {
    label: 'Adjust reading level',
    prompts: [
      'Simplify the reading level of the {topic} content',
      'Rewrite {topic} at a lower Lexile level for struggling readers',
      'Make the language in {topic} more accessible',
    ],
  },
];
