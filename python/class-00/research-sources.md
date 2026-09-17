# Class 0: research landscape — source notes

Verified/accessed **2026-09-12**. Prepared for English student slides with Chinese speaker notes. This is a teaching design and source audit, not a bibliometric census. The example placements below are **illustrative judgments**, not measured coordinates or discipline-wide rankings.

## Recommended message and map

研究并不等于去实验室；不同问题需要不同证据。同一学科可以同时包含实验、观测、公开数据再分析、理论与仿真。一项项目也可能从数据库发现问题，到实验验证，再用模型解释。

**Student heading:** “One field. Several ways to investigate.”

**Student takeaway:** “Your question decides what evidence you need.”

Use project examples, not one dot labelled “Biology” or “Finance”. A defensible schematic map is:

| Axis | Low / left / bottom | High / right / top |
| --- | --- | --- |
| X: Need for new real-world measurements | Reuse records or models | Collect new measurements |
| Y: Role of change in the investigation | Observe and compare | Test changes / ask “what if” |

Four useful regions: existing-data comparison; new observation; computational what-if; physical/participant experiment. The top-left region produces **new calculated outputs**, even when no new physical measurements are collected. Do not label those outputs “existing data”. Keep markers equal-sized; do not add percentages or numeric axis ticks. Projects may cross regions.

**Footer:** “Illustrative projects, not a census. Research often combines methods.”

The map concerns empirical and computational workflows. Mathematical proof, theory building, historical interpretation, literature synthesis, and qualitative work are also research; no four-quadrant image covers every method. The `basic / applied / experimental development` classification describes **purpose**, not where evidence comes from. NSF/NCSES explicitly separates these three R&D types; its statistics must not be relabelled as lab/database/simulation shares. [NCSES official definitions](https://ncses.nsf.gov/pubs/ncses22209) (published 2022; cites OECD Frascati Manual 2015).

## Examples by field

These are proposed student questions, not claims that the suggested analysis has already been performed. Public access does not remove the need to read metadata, check suitable comparisons, or identify uncertainty.

| Field | Reuse existing evidence | Collect new physical / participant evidence | Model or simulation |
| --- | --- | --- | --- |
| Biology | “Which genes differ between two sample groups in an existing GEO study?” | “How does changing light affect plant growth?” Keep other conditions comparable, measure repeatedly. | “What happens to a simple population model when its growth rate changes?” A model prediction needs checking against observations. |
| Finance / economics | “How did interest rates and inflation change?” Use FRED. “How did reported company revenue change?” Use EDGAR. | “Do different auction rules produce different prices?” Observe real participants under specified rules. | “How sensitive is a hypothetical portfolio to a shock?” Assumptions and historical patterns do not establish future performance. |
| Environment | “How has land cover or surface temperature changed?” Use NASA Earthdata. | “How do temperatures differ between shaded and sunny locations?” Record place, time, and instrument. | “How might a rain garden change runoff?” A rainfall/runoff model compares scenarios. |
| Engineering / robotics | “Where did this robot fail in its recorded runs?” Use existing sensor logs. | “Does the real robot stop before a changed obstacle?” Measure actual runs. | “Will the same route work on two maps?” Compare simulated outcomes, then test hardware. |
| Astronomy (optional extension) | “How do known planet sizes and orbital periods compare?” Use the NASA Exoplanet Archive. | Collect telescope observations; equipment may be shared or remotely operated. | Fit a light-curve/orbit model and compare model outputs with observations. |
| Society (optional extension) | Compare public Census summaries across places/time. | Conduct suitable interviews, surveys, or observation with a supervised research design. | Examine an explicit population or transport model under alternative assumptions. |

### Primary sources supporting those examples

- **GEO:** NIH/NCBI's public repository archives functional genomics data and provides download/query tools. [GEO overview](https://www.ncbi.nlm.nih.gov/geo/info/overview.html) (no visible publication date; accessed 2026-09-12). **GEO2R** supports comparing sample groups within an existing study. It uses R/Bioconductor; do not describe GEO2R itself as Python. [GEO2R documentation](https://www.ncbi.nlm.nih.gov/geo/info/geo2r.html) (living documentation; accessed 2026-09-12). Student analysis can use an instructor-prepared, documented subset; differences do not by themselves establish biological causation.
- **Physical biology:** NASA publishes a classroom investigation of plant responses to light wavelengths. [Investigating Science: Plant Response to Stimuli](https://www.nasa.gov/stem-content/investigating-science-plant-response-to-stimuli/) (updated 2024-03-22). This is an accessible example of physical experimentation; advanced cell culture, gene editing, and related work require appropriate laboratory facilities and supervision.
- **FRED:** the St. Louis Fed maintains economic time-series data and charting/download tools. [What is FRED?](https://fredhelp.stlouisfed.org/fred/about/about-fred/what-is-fred/) (living overview; accessed 2026-09-12). The API can be queried from programs in multiple languages. [FRED API overview](https://fred.stlouisfed.org/docs/api/fred/overview.html) (living documentation; accessed 2026-09-12). A first classroom activity can use an instructor-prepared CSV rather than require API registration.
- **Company financial data:** SEC financial statement datasets contain reported financial figures extracted from XBRL filings, supporting comparisons across companies and time. The SEC cautions that extracted datasets are not substitutes for full filings. [Financial Statement Data Sets](https://www.sec.gov/data-research/sec-markets-data/financial-statement-data-sets) (living dataset; accessed 2026-09-12). [Developer resources](https://www.sec.gov/about/developer-resources) (published 2024-06-25; updated 2025-03-10).
- **Experimental economics:** the Nobel Foundation describes Vernon Smith's controlled market experiments and how auction rules can affect outcomes. [2002 prize presentation speech](https://www.nobelprize.org/prizes/economic-sciences/2002/ceremony-speech/) (speech 2002; collected in *Les Prix Nobel*, 2003). This supports putting an economics project in the experimental region; economics is not exclusively database research.
- **Earth observation:** NASA Earthdata provides data and topic-guided resources spanning atmosphere, land, oceans, climate indicators, and other systems. [Earthdata](https://www.earthdata.nasa.gov/home) (living portal; accessed 2026-09-12). Its LP DAAC describes no-cost land datasets used in agriculture, geology, urban heat, and wildfire work. [LP DAAC](https://www.earthdata.nasa.gov/centers/lp-daac) (living page; accessed 2026-09-12). Satellite surface temperature and local air temperature are different measurements; do not silently interchange them.
- **Environmental simulation:** EPA's SWMM calculates runoff and drainage behavior, including alternative green infrastructure. It is publicly available and can compare scenarios. [Storm Water Management Model](https://www.epa.gov/water-research/storm-water-management-model-swmm) (living software page; accessed 2026-09-12). It is an example of a simulation; a model does not become a Digital Twin merely because it has a map.
- **Astronomy:** the NASA Exoplanet Archive supplies public planet/star parameters and observational data tied back to the literature. [Archive overview](https://exoplanetarchive.ipac.caltech.edu/docs/intro.html) (updated 2025-08-13). The archive can be explored through tables or programmatic queries. [TAP access](https://exoplanetarchive.ipac.caltech.edu/docs/API_resources.html) (living documentation; accessed 2026-09-12).
- **Society:** the U.S. Census Bureau makes its public data available as open data. [Census open data](https://www.census.gov/topics/research/research-transparency-public-access/open-data.html) (living page; accessed 2026-09-12). Public summaries do not disclose every individual's circumstances and do not support individual-level causal claims by themselves.

## Digital Twin: a connection, not a fifth isolated box

For this engineering-oriented introduction, use a physical-system example: a particular classroom/robot/machine is measured; data update its digital representation; a model predicts possible behavior; predictions are checked against measurements before decisions are acted on. Draw a **loop bridging physical measurements and computation**, not a mutually exclusive box that replaces experiment.

**Student wording:** “A simulation explores a model. A digital twin keeps a model connected to a particular real system through data.”

**Diagram labels:** “Real system → Measurements → Updated model → Predictions → Compare with reality.”

**Speaker note:** “现在课件里的灯和机器人是规则仿真，没有连接真实传感器。要走向数字孪生，需要对应的真实系统、持续或按需更新的数据、用途明确的模型，以及与实测结果的验证。‘会动的三维图’本身不够。更新频率取决于用途，不一定每毫秒；也不必在这节课把自动双向控制当作所有定义都要求的条件。”

NIST describes manufacturing twins as synchronized models and emphasizes validation and quantified uncertainty. [Digital Twins for Advanced Manufacturing](https://www.nist.gov/programs-projects/digital-twins-advanced-manufacturing) (created 2024-04-15; updated 2026-07-20). Its lab report uses the ISO 23247 manufacturing formulation: a representation suited to its purpose and synchronized with an observable manufacturing element. [NIST AMS 100-68](https://nvlpubs.nist.gov/nistpubs/ams/NIST.AMS.100-68.pdf) (2025). Definitions vary across domains, so this is a suitable teaching convention grounded in manufacturing sources, not a claim of universal terminological agreement.

## What can honestly be said about percentages?

**Finding:** targeted searches did not identify a representative, current, cross-disciplinary census giving comparable shares of “lab / database / simulation / Digital Twin” research. This is a finding of this source search, not proof that no such study could exist. The categories overlap, and plausible denominators differ: papers, researchers, projects, person-hours, or research expenditure. A paper can use all four methods. Repository sizes, download counts, code popularity, and spending on basic/applied research cannot supply the requested method shares.

Do not invent a global pie chart or draw field-sized bubbles implying measured volume. A count of the classroom's example cards may be shown only as **“our example projects”**, not “research in the world”. An actual survey's single-choice responses can be charted with its population and denominator clearly identified, as below.

### A defensible scoped primary-activity chart

Tenopir et al., **2017–2018 volunteer survey**, Fig. 3: **2,032 respondents** selected their primary research activity. Full categories verified visually against the figure:

| Original category | Share of respondents |
| --- | ---: |
| Field Research | 34.6% |
| Modeling | 27.9% |
| Lab Research | 24.4% |
| GIS | 5.5% |
| Other | 7.6% |

**Chart title:** “What did these respondents mainly do?”

**Subtitle:** “2017–18 volunteer survey · primary research activity · n = 2,032”

**Visible qualifier:** “Survey respondents, not all research. Projects can combine methods.”

Prefer horizontal bars. Preserve categories: Modeling does not mean simulation-only; GIS does not mean database-only; Other does not mean Digital Twin. Selection bias precludes global or field-wide generalization.

### Separate data-reuse question

Fig. 8: **38.3% of 1,795 respondents** reported always/frequently using some or all data collected outside their immediate team. This measures reuse, not database-only work. Its denominator differs; do not add it to the primary-activity chart.

Source: [Tenopir et al., *PLOS ONE*](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0229003), published **2020-03-11**, Figs. 3/8, Methods/Limitations; accessed 2026-09-12. [Original Fig. 3 image](https://journals.plos.org/plosone/article/figure/image?download=&id=10.1371%2Fjournal.pone.0229003.g003&size=large).

**中文讲者备注：**“这不是世界科研比例，而是这次志愿调查中受访者的主要工作方式。数据再利用是另一道题：实验室研究者也可以复用他人数据。先看分母、抽样和问题，再看百分比。”

## Two short stories worth considering

1. **“Can a classroom become an economics lab?”** In his autobiographical account, Vernon Smith describes running a buyer/seller market experiment at Purdue in January 1956. Changing trading rules let him test economic predictions with people making choices. Use this as a 30–45-second surprise that research methods are not determined by the school subject name. [Smith autobiography](https://www.nobelprize.org/prizes/economic-sciences/2002/smith/biographical/) (autobiography for the 2002 prize; accessed 2026-09-12). Do not turn one class's outcome into a universal market law.
2. **“School plants, space questions.”** NASA reports that middle- and high-school students in Growing Beyond Earth conduct plant experiments connected to questions about space food production. [NASA story](https://science.nasa.gov/learning-resources/science-activation/watch-how-students-help-nasa-grow-plants-in-space-growing-beyond-earth/) (2024-10-28). This is a concrete bridge from ordinary physical experiments to significant questions; no claim that this course already participates in the program.

## How this serves the Python course

Connect the map to a modest first workflow: **question → documented data or measurements → a small program → a plot/test → a claim with limits**. “A new graph” is an output; learning to say what it supports and what it does not support is part of the research skill. Python enables reading tables, plotting, implementing models, and controlling compatible devices, while domain knowledge and evidence determine whether the result is meaningful. Database availability creates an accessible starting point; it does not mean every project can skip physical validation or that high-school beginners immediately conduct advanced research.
