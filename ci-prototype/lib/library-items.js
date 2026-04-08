// All library items used for semantic search
// Each item has a `text` field used for embedding (label + tags combined)

export const MY_LIBRARY = [
  { id: 'my-1',  label: 'Summer of Mariposas Quiz Pt. 1',  sub: 'Modified 2 days ago',   icon: '/icons/Forms.svg', subject: 'ela',     text: 'Summer of Mariposas Quiz Part 1 mariposas summer reading novel fiction' },
  { id: 'my-2',  label: 'Summer of Mariposas Quiz Pt. 2',  sub: 'Modified 5 days ago',   icon: '/icons/Forms.svg', subject: 'ela',     text: 'Summer of Mariposas Quiz Part 2 mariposas summer reading novel fiction' },
  { id: 'my-3',  label: 'Point of View Quiz',              sub: 'Modified 3 weeks ago',  icon: '/icons/Forms.svg', subject: 'ela',     text: 'Point of View Quiz reading perspective narrator author first person third person' },
  { id: 'my-4',  label: 'Character Analysis Graphic Org.', sub: 'Modified 1 month ago',  icon: '/icons/Docs.svg',  subject: 'ela',     text: 'Character Analysis Graphic Organizer novel reading gatsby mariposas character traits motivation' },
  { id: 'my-5',  label: 'Reading Response Journal',        sub: 'Modified 3 weeks ago',  icon: '/icons/Docs.svg',  subject: 'ela',     text: 'Reading Response Journal novel text reflection comprehension' },
  { id: 'my-6',  label: 'Ratios and Proportions Quiz',     sub: 'Modified 1 week ago',   icon: '/icons/Forms.svg', subject: 'math',    text: 'Ratios and Proportions Quiz math numbers fractions equivalent rates' },
  { id: 'my-7',  label: 'Fractions Review',                sub: 'Modified 2 weeks ago',  icon: '/icons/Docs.svg',  subject: 'math',    text: 'Fractions Review math numbers divide operations numerator denominator' },
  { id: 'my-8',  label: 'Anchor Chart — Math Vocabulary',  sub: 'Modified 1 month ago',  icon: '/icons/Docs.svg',  subject: 'math',    text: 'Anchor Chart Math Vocabulary terms definitions concepts operations' },
  { id: 'my-9',  label: 'Cause & Effect Notes',            sub: 'Modified 2 weeks ago',  icon: '/icons/Docs.svg',  subject: 'history', text: 'Cause and Effect Notes history events war revolution Washington colonial American founding' },
  { id: 'my-10', label: 'Primary Source Analysis Sheet',   sub: 'Modified 1 month ago',  icon: '/icons/PDF.svg',   subject: 'history', text: 'Primary Source Analysis Sheet document history Washington colonial revolution American founding fathers' },
  { id: 'my-11', label: 'Timeline Activity',               sub: 'Modified 3 weeks ago',  icon: '/icons/Docs.svg',  subject: 'history', text: 'Timeline Activity history events sequence war revolution Washington American founding colonial' },
  { id: 'my-12', label: 'Lab Report Template',             sub: 'Modified 2 weeks ago',  icon: '/icons/Docs.svg',  subject: 'science', text: 'Lab Report Template science experiment data observation hypothesis results' },
  { id: 'my-13', label: 'Vocabulary Graphic Organizer',    sub: 'Modified 1 month ago',  icon: '/icons/Docs.svg',  subject: 'science', text: 'Vocabulary Graphic Organizer science terms definitions biology chemistry' },
];

export const DISTRICT_LIBRARY = [
  { id: 'dist-1',  label: 'Summer of Mariposas Close Reading Ch.1', sub: 'District · ELA Dept',            icon: '/icons/PDF.svg',   subject: 'ela',     text: 'Summer of Mariposas Close Reading Chapter 1 novel fiction comprehension annotation' },
  { id: 'dist-2',  label: 'Summer of Mariposas Close Reading Ch.2', sub: 'District · ELA Dept',            icon: '/icons/PDF.svg',   subject: 'ela',     text: 'Summer of Mariposas Close Reading Chapter 2 novel fiction comprehension annotation' },
  { id: 'dist-3',  label: 'Figurative Language Quiz',               sub: 'District · ELA Dept',            icon: '/icons/Forms.svg', subject: 'ela',     text: 'Figurative Language Quiz metaphor simile personification hyperbole ELA reading' },
  { id: 'dist-4',  label: 'Text Evidence Practice',                 sub: 'District · ELA Dept',            icon: '/icons/Docs.svg',  subject: 'ela',     text: 'Text Evidence Practice cite quoting citing reading comprehension gatsby mariposas novel' },
  { id: 'dist-5',  label: 'Literary Analysis Rubric',               sub: 'District · ELA Dept',            icon: '/icons/Docs.svg',  subject: 'ela',     text: 'Literary Analysis Rubric essay writing novel theme character plot ELA' },
  { id: 'dist-6',  label: 'Ratios Grade 7 Assessment',              sub: 'District · Math Dept',           icon: '/icons/Forms.svg', subject: 'math',    text: 'Ratios Grade 7 Assessment math proportions rates equivalent fractions' },
  { id: 'dist-7',  label: 'Number Sense Practice',                  sub: 'District · Math Dept',           icon: '/icons/Docs.svg',  subject: 'math',    text: 'Number Sense Practice arithmetic operations integers math computation' },
  { id: 'dist-8',  label: 'Fractions Unit Assessment',              sub: 'District · Math Dept',           icon: '/icons/Forms.svg', subject: 'math',    text: 'Fractions Unit Assessment math numerator denominator operations divide multiply' },
  { id: 'dist-9',  label: 'US History Standards Alignment',         sub: 'District · Social Studies Dept', icon: '/icons/PDF.svg',   subject: 'history', text: 'US History Standards Alignment Washington colonial revolution war civil rights American founding' },
  { id: 'dist-10', label: 'DBQ: Primary Source Analysis Guide',     sub: 'District · Social Studies Dept', icon: '/icons/Docs.svg',  subject: 'history', text: 'DBQ Primary Source Analysis Guide document history Washington revolution war colonial American founding fathers' },
  { id: 'dist-11', label: 'Social Studies Vocabulary Bank',         sub: 'District · Social Studies Dept', icon: '/icons/Docs.svg',  subject: 'history', text: 'Social Studies Vocabulary Bank history terms Washington colonial revolution civil rights American' },
  { id: 'dist-12', label: 'Science Lab Safety & Procedures',        sub: 'District · Science Dept',        icon: '/icons/PDF.svg',   subject: 'science', text: 'Science Lab Safety Procedures experiment equipment rules biology chemistry physics' },
  { id: 'dist-13', label: 'NGSS Standards Alignment Guide',         sub: 'District · Science Dept',        icon: '/icons/Docs.svg',  subject: 'science', text: 'NGSS Standards Alignment Guide science biology chemistry physics Next Generation Science' },
];

// Smaller set used in the create/search panel
export const MY_LIB_CS = [
  { id: 'cs-my-1', label: 'Summer of Mariposas Quiz Pt. 1', sub: 'Modified 2 days ago',  icon: '/icons/Forms.svg', subject: 'ela',  text: 'Summer of Mariposas Quiz Part 1 mariposas summer reading novel fiction' },
  { id: 'cs-my-2', label: 'Summer of Mariposas Quiz Pt. 2', sub: 'Modified 5 days ago',  icon: '/icons/Forms.svg', subject: 'ela',  text: 'Summer of Mariposas Quiz Part 2 mariposas summer reading novel fiction' },
  { id: 'cs-my-3', label: 'Point of View Quiz',             sub: 'Modified 3 weeks ago', icon: '/icons/Forms.svg', subject: 'ela',  text: 'Point of View Quiz reading perspective narrator author first person' },
  { id: 'cs-my-4', label: 'Ratios and Proportions Quiz',    sub: 'Modified 1 week ago',  icon: '/icons/Forms.svg', subject: 'math', text: 'Ratios and Proportions Quiz math numbers fractions rates' },
  { id: 'cs-my-5', label: 'Fractions Review',               sub: 'Modified 2 weeks ago', icon: '/icons/Docs.svg',  subject: 'math', text: 'Fractions Review math numbers divide operations' },
  { id: 'cs-my-6', label: 'Anchor Chart — Math Vocabulary', sub: 'Modified 1 month ago', icon: '/icons/Docs.svg',  subject: 'math', text: 'Anchor Chart Math Vocabulary terms definitions concepts' },
];

export const DIST_LIB_CS = [
  { id: 'cs-dist-1', label: 'Summer of Mariposas Close Reading Ch.1', sub: 'District · ELA Dept',  icon: '/icons/PDF.svg',   subject: 'ela',  text: 'Summer of Mariposas Close Reading Chapter 1 novel comprehension' },
  { id: 'cs-dist-2', label: 'Summer of Mariposas Close Reading Ch.2', sub: 'District · ELA Dept',  icon: '/icons/PDF.svg',   subject: 'ela',  text: 'Summer of Mariposas Close Reading Chapter 2 novel comprehension' },
  { id: 'cs-dist-3', label: 'Figurative Language Quiz',               sub: 'District · ELA Dept',  icon: '/icons/Forms.svg', subject: 'ela',  text: 'Figurative Language Quiz metaphor simile personification ELA' },
  { id: 'cs-dist-4', label: 'Text Evidence Practice',                 sub: 'District · ELA Dept',  icon: '/icons/Docs.svg',  subject: 'ela',  text: 'Text Evidence Practice cite quoting reading comprehension' },
  { id: 'cs-dist-5', label: 'Ratios Grade 7 Assessment',              sub: 'District · Math Dept', icon: '/icons/Forms.svg', subject: 'math', text: 'Ratios Grade 7 Assessment math proportions rates' },
  { id: 'cs-dist-6', label: 'Number Sense Practice',                  sub: 'District · Math Dept', icon: '/icons/Docs.svg',  subject: 'math', text: 'Number Sense Practice arithmetic operations integers' },
  { id: 'cs-dist-7', label: 'Fractions Unit Assessment',              sub: 'District · Math Dept', icon: '/icons/Forms.svg', subject: 'math', text: 'Fractions Unit Assessment math divide multiply' },
];
