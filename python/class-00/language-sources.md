# Class 0: language choices, stories, and syllabus alignment

Prepared 12 September 2026. This is an editorial source memo for the English slides and Chinese speaker notes. Historical claims below use official documentation, original institutional histories, or the language creator's account. Suggested visuals, teaching transitions, and the choice of examples are course design proposals, not measured educational effects.

## Recommended additions and placement

The existing Class 0 answers “Why learn programming with AI?” but does not yet directly answer “Why this language?” The natural chain is: the instructor's changing tools → the kinds of problems languages serve → why Python fits this course → what research can look like → first precise rule and test → AI partnership → the 15-lesson pathway.

Add three short visual units, keeping detailed reference material optional so the two existing practical activities still have time:

1. **Why Python for our first research projects?** A central Python notebook connects four illustrated stations: a small rule; an array of simulated readings; a data table and chart; a baseline and its test results. Reveal the stations rather than presenting a long list of logos.
2. **Different tools for different jobs.** Let students select a task (website, robot, data study, database, app, animation) and highlight possible languages. Use overlaps, not a single ranking or a percentage pie chart.
3. **Tools change who can build.** Three story cards: Dartmouth BASIC; Visual Basic's graphical interfaces; Python's origin. A small “same question today” prompt connects them to AI assistance. This can sit beside or immediately after `my-start`, or serve as one reveal-based timeline with `why-python`.

Do not add installation work, language syntax comparisons, or a full history lecture to the orientation. A single familiar requirement—the automatic lamp—is enough to show a block, a Python condition, and a system diagram expressing the same rule.

## Slide-ready English and Chinese notes

### Why Python for our first research projects?

**English headline:** “A readable bridge from a question to evidence.”

**Four short labels:**

- Read a small program and test an idea.
- Work with tables, signals, and simulations.
- Reuse tools for charts and machine learning.
- Keep code, outputs, and explanations together.

**Footer:** “We choose Python to match our projects. Other tasks may call for other languages.”

**Chinese notes:** 我们选择Python，首先因为它与这门课的任务相配：从一个学生能读懂的短程序开始，逐步处理数组、表格、图和模型。工具箱能帮助我们把精力放在问题、数据含义和检验上，但装了一个库并不等于已经懂了研究方法。Python也会调用其他语言写的高效计算代码；学语言不是选出一个永远获胜的冠军。把图中的四个站点对应到第1–3、4–8、9–13、14–15课。Notebook能保存代码、文字和输出；可复现仍需要数据来源、运行顺序、版本和实际重跑。

The rationale is a synthesis of Python's interactive, readable workflow and the libraries below. The source material supports capabilities; the decision to use those capabilities for this beginner course is instructional judgment. [Python tutorial introduction](https://docs.python.org/3/tutorial/appetite.html), [Jupyter notebook format](https://jupyter.org/).

### Different tools for different jobs

**English headline:** “Start with the job you want to do.”

Use the following short rows as selectable illustrated cards. The language families overlap; these are representative associations, not exclusive rules or labor-market shares.

| Student's task | Representative tools | Characteristic worth explaining | Primary source |
|---|---|---|---|
| Explore a table, simulate a rule, test a model | Python | General-purpose programming with a scientific/data library ecosystem | [Python applications](https://www.python.org/about/apps/) |
| Make an interactive website | JavaScript / TypeScript | JavaScript drives browser behavior; TypeScript adds type-checking syntax and converts to JavaScript | [MDN JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript), [TypeScript](https://www.typescriptlang.org/) |
| Control a small board; work close to hardware | C / C++ | Hardware-facing code and explicit control of resources; Arduino is one concrete example | [Arduino's C/C++ explanation](https://support.arduino.cc/hc/en-us/articles/360018448219-Can-I-program-the-Arduino-board-in-C) |
| Build an application or service | Java / C# | Large runtime and library ecosystems; types help tools check some mistakes before execution | [Java introduction](https://dev.java/learn/getting-started/), [C# overview](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/overview) |
| Ask a relational database a question | SQL | Specify which rows and summaries you want; it commonly works alongside Python | [PostgreSQL SQL tutorial](https://www.postgresql.org/docs/current/tutorial-sql.html) |
| Explore statistics and make statistical graphics | R | An environment built around statistical computing and graphics | [R project overview](https://www.r-project.org/about.html) |
| Animate a story or construct a rule visually | Scratch / a Blockly-based editor | Scratch is a creative coding platform; Blockly is a library used to build block editors | [Scratch Foundation](https://www.scratchfoundation.org/home), [Blockly overview](https://docs.blockly.com/guides/get-started/what-is-blockly/) |

**Chinese notes:** 这张图是在按任务选工具，不是在按能力分等级。同一个项目常常会组合多种语言，例如网页交互用JavaScript、查询数据库用SQL、分析用Python。Blockly不是Scratch的另一个名字，也不是本课程另一个Python执行器：我们已经做好的积木页运行约定的规则，并显示Python预览；真正的Python仍在Python实验页运行。Python和C/C++也不是互斥关系。

**Optional revealing diagram:** `A readable Python call → a tested library → compiled numerical work → a result to check`. NumPy documents that many array operations run in compiled code, so the speed of a whole scientific workflow cannot be inferred from the surface language alone. Keep this as one sentence for students; do not introduce compiler internals in the core talk. [NumPy overview](https://numpy.org/doc/stable/user/whatisnumpy.html).

### Three short stories tied to the instructor's journey

| Story card | Accurate English copy | Visual / audience prompt | Chinese speaking transition |
|---|---|---|---|
| BASIC · 1964 | “At Dartmouth, BASIC and time-sharing helped open computing to students across campus. Undergraduates helped build the system.” | Draw two terminal windows connected to one computer. Prompt: “Who should be allowed to try programming?” | 我小时候学的BASIC背后有这样一个教育理想：让更多学生能接触计算机。这里只讲语言的历史日期，不替我的个人经历补年份。 |
| Visual Basic · 1991 | “Visual Basic 1.0 was demonstrated on May 20, 1991. A graphical interface made buttons and events a natural way to think about an application.” | Draw a neutral window and button; clicking it reveals `event → rule → result`. Prompt: “A button looks simple. What must happen after the click?” | 这可以接上我高考后学VB、本科做摇奖程序的经历。界面更容易画出来，但抽奖规则仍要由人说明和检查。不能把未提供的个人项目细节补成历史故事。 |
| Python · 1989 / 1991 | “Guido van Rossum began Python during the 1989 Christmas holidays and shared it publicly in February 1991. Its name came from the comedy show Monty Python.” | Draw a calendar, a short code card, and a theater mask. Prompt: “What name would you give a language you invented?” | Python最初是在解决实际编程工具的需要。工具后来可以去到很多领域。今天AI也能帮我们形成第一版，但问题、测试和结论仍需要我们掌握。最后这一句是课程的教育立场，不是历史材料证明的学习效果。 |

Sources: [Dartmouth BASIC history](https://www.dartmouth.edu/basicfifty/), [Dartmouth Library exhibit](https://www.library.dartmouth.edu/exhibits/sharing-the-computer), [Microsoft Visual Basic anniversary](https://devblogs.microsoft.com/vbteam/happy-20th-birthday-visual-basic/), [Guido's Python origin account](https://docs.python.org/3/faq/general.html#why-was-python-created-in-the-first-place), [Python name](https://docs.python.org/3/faq/general.html#why-is-it-called-python).

For the VB interface explanation, Microsoft's archived 2001 article explicitly compares placing controls and creating forms with VB 6.0 and earlier. Modern Windows Forms documentation explains the continuing event-handler idea; do not label a modern .NET screenshot as VB 1.0. [Archived Microsoft form-design article](https://learn.microsoft.com/en-us/archive/msdn-magazine/2001/april/serving-the-web-windows-forms-in-visual-basic-net), [Windows Forms events and controls](https://learn.microsoft.com/en-us/dotnet/visual-basic/developing-apps/windows-forms/).

**Historical precision:** Dartmouth institutional accounts vary on who was present and who pressed RUN at approximately 4 a.m. on 1 May 1964. The library exhibit calls that scene a legend; Kurtz's oral history says neither professor recalled being there. Use the date and the student contribution without staging a supposedly verified scene of Kemeny pressing RUN. [Kurtz oral history](https://www.dartmouth.edu/library/rauner/archives/oral_history/oh_interviews_pdf/T_Kurtz_pt1.pdf).

If a fourth optional story is useful, add **Fortran · 1957**: IBM's team led by John Backus made mathematical formulas easier to express in programs. A formula card becoming code is a good precursor to NumPy arrays. Do not call Fortran “the first programming language”; this shorthand hides earlier systems and competing definitions. [IBM Fortran history](https://www.ibm.com/history/fortran), [Backus's retrospective paper record](https://research.ibm.com/publications/the-history-of-fortran-i-ii-and-iii--1).

## Libraries connect the language choice to the actual syllabus

| Course unit | What the library/environment contributes | What students must still decide |
|---|---|---|
| 1–3: values, lists, conditions, loops, functions, records | Python expresses the small rule and supports immediate experiments | Inputs, expected output, a boundary case, and an explanation |
| 4: NumPy and simulation | Arrays, numerical operations, and random simulations | What the model assumes; parameters; ground truth; which change to compare |
| 5–6: pandas and cleaning | Tables, selection, grouped summaries, missing-value operations | What each column means; justified cleaning; a decision record |
| 7–8: charts and research questions | Matplotlib makes static, animated, and interactive graphics | Which chart answers the question; units; what the pattern does not prove |
| 9–13: baselines, regression, classification, trees, model comparison | scikit-learn provides model fitting and evaluation tools | Data split, baseline, metric, fair comparison, held-out test, and failure analysis |
| 14–15: reproducible story and showcase | A Jupyter notebook can combine code, prose, equations, and rich output | Honest result, limitations, attribution, and a project another person can rerun |

Official references: [Python tutorial](https://docs.python.org/3/tutorial/appetite.html), [NumPy](https://numpy.org/doc/stable/user/whatisnumpy.html), [pandas](https://pandas.pydata.org/docs/getting_started/overview.html), [Matplotlib](https://matplotlib.org/), [scikit-learn](https://scikit-learn.org/stable/), [Jupyter](https://jupyter.org/).

Do not present NumPy, pandas, Matplotlib, scikit-learn, and Jupyter as separate programming languages. They form tools around the language. Do not suggest the course teaches all of their APIs or trains a large language model.

## Review against the existing deck and 15-lesson design

Reviewed `courses-site/builders/python/class-00.js`, `courses-site/builders/python/course.js`, and `docs/python-research-course-design.md`.

| Gap or risk | Recommended correction |
|---|---|
| `why-learn` explains the value of foundations but does not explain the choice of Python | Add the capability-to-course diagram and explicit task fit statement |
| The instructor's research journey jumps from robotics to a general invitation without giving students a concrete research mental model | Add the research-method map and one question that can be approached using measurements, existing data, and a model; label their different evidential limits |
| `course-path` compresses 9–15 into one block | Split its visual into 9–13 “compare models fairly” and 14–15 “explain and share”; retain all 15 lesson numbers |
| New stories and research context could consume the 60 minutes | Keep language details in click-to-reveal cards or optional appendix; trim repeated lamp framing across `what-is-programming`, `sensor-model`, and `lamp-contract`, while retaining advance predictions and both activities |
| “Research” may sound like the course guarantees a publication | State the achievable output: a small question, a baseline, one justified change, actual results, limitations, and a runnable notebook with a draft abstract/poster |
| Biology, finance, and Digital Twins can sound like additional project tracks | Distinguish the broad research landscape from the five actual starter routes: games, football tracking, synthetic biological signals, environmental data, simulated robot control |
| Simulated biological data may be mistaken for biological experiments or clinical evidence | Label the signal project synthetic; it tests an algorithm under stated assumptions, not a medical claim |
| A classroom simulator may be mistaken for an operational Digital Twin | Preserve the distinction between a simple simulation and a model connected to an identified physical counterpart and its measurements |
| A polished notebook may hide whether the learner understands it | Retain independent prediction, intentional edit, error analysis, and oral explanation as visible course expectations |
| Course sequence may be read as a promise that all materials are already ready | The course data currently marks Class 1 ready and Classes 2–15 planned; the design document explicitly says detailed future materials are developed before each lesson |

The existing design is already unusually explicit about scope: five small projects on ordinary laptops, one baseline and one change, protected test data, failure records, and conditional submission preparation. The orientation should expose that logic visually rather than expand the promise into hardware development, advanced biology, finance trading, and full Digital Twins at once.

## Terminology and evidence boundaries

- **Avoid a current language ranking.** “Python is widely used in scientific computing” is supported by the official applications page. “Python is #1” requires a named index, date, population, and measurement, and would not establish the best language for this course.
- **Avoid “interpreted means never compiled.”** CPython compiles source to bytecode. Java also uses bytecode, JavaScript may use just-in-time compilation, and NumPy calls compiled operations. For the slide, “edit a small program and run it interactively” states the useful experience without misleading execution categories. [Python glossary](https://docs.python.org/3/glossary.html#term-bytecode), [Java execution cycle](https://dev.java/learn/getting-started/), [MDN JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript).
- **Avoid “AI makes syntax unnecessary.”** The current course explicitly teaches reading, writing, debugging, checking, and explaining small programs. Assistance changes the workflow; it does not by itself establish understanding.
- **Avoid invented research shares.** Language sites, library capability descriptions, and a handful of example projects do not measure what percentage of a discipline uses a lab or database. A landscape diagram can show possible approaches; numerical shares require a separately defined sampling frame and method.
- **Keep all biographical dates unspecified unless supplied by the instructor.** Public dates attached to BASIC, VB, and Python are language history, not dates of Bo Shang's personal learning or competitions.

All drawings proposed here can be original HTML/SVG diagrams. Archive photographs are optional and need their own credit and reuse check; no historical photograph is necessary to tell these stories accurately.

## Addendum: why the syllabus is ordered this way, and the later four lessons

Implemented `courses-site/builders/python/class-00-syllabus.js` with three slide objects plus scoped CSS and a reveal-check interaction. It exports `slides`, `css`, `js`, `sources`, `phases`, and individual body functions. Root integration assigns the actual timing. `course-path` replaces the existing slide; `algorithm-map` and `why-these-models` follow it.

The full list of 15 lesson names is derived from `course.js`. Four phases expose the instructional dependency: explain a program (1–3), understand its data and experimental question (4–8), compare methods fairly (9–13), then communicate a reproducible project (14–15). This is the course's design rationale, not evidence that the sequence is educationally optimal.

The detailed English/Chinese research curriculum explicitly names **linear regression in Lesson 10** and **decision trees in Lesson 12**. Lesson 11 covers classification, thresholds, confusion matrices, and the meaning of errors; it does not prescribe a named classifier. Lesson 13 is evaluation. Thus the orientation describes **four lessons with different roles**, rather than inventing a promise to teach four algorithms. Logistic regression appears as a clearly labeled example of classification. The unrelated AI Toolbox's random forests, KNN, SVM, and neural-network units are not imported into this course.

The partial algorithm map distinguishes supervised-learning tasks (number or category), possible model families, and evaluation. The three illustrated model cards explain inspectable predictions, threshold choices, and tree complexity. A button reveals what to test: curvature/extrapolation, false alarms/misses, and validation performance as depth grows. All drawings are explicitly schematic; they have no fitted data or invented measured scores.

Primary sources checked: [linear and logistic models](https://scikit-learn.org/stable/modules/linear_model.html), [decision trees](https://scikit-learn.org/stable/modules/tree.html), [supervised-learning families](https://scikit-learn.org/stable/supervised_learning.html), [held-out evaluation](https://scikit-learn.org/stable/modules/cross_validation.html), [simple classifier comparators](https://scikit-learn.org/stable/modules/generated/sklearn.dummy.DummyClassifier.html). “Baseline” names the role a reference method plays in a comparison; it is not one unique algorithm.

Isolated checks confirmed three slide objects, four phases, all 15 lesson titles, English narration and Chinese notes, and 1280×720 visual fit. The visible-failure toggle changes its accessible pressed state and explanatory text. Integrated deck timing, playback, and production checks remain with the root task.
