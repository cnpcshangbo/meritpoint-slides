"""Your First Python Research Experiment.

Run with: python trial_lab.py
Requires Python 3 and matplotlib. No API, account, upload, or data download.
All data are invented teaching examples. Edits are hypothetical scenarios.
The PNG is written beside this script. See the notebook for learner prompts.
"""
from pathlib import Path
import matplotlib
matplotlib.use("Agg")  # Save the figure without requiring a desktop window

# Step 1. Predict, then say hello
print('Hello, research!')

# Step 2. Give numbers names
goals = 3
attempts = 5
rate = goals / attempts * 100
print(rate)

# Step 3. Let a list remember each attempt
shots = [1, 0, 1, 1, 0]
print(sum(shots))
print(len(shots))
print(sum(shots) / len(shots) * 100)

# Step 4. Compare three distances
distances_m = [3, 6, 9]
near = [1, 1, 1, 1, 0]
mid = shots.copy()
far = [0, 1, 0, 0, 1]

goals_by_distance = [sum(near), sum(mid), sum(far)]
average_goals = sum(goals_by_distance) / len(goals_by_distance)
print("Goals out of 5:", goals_by_distance)
print("Average goals:", average_goals)
print("Maximum goals:", max(goals_by_distance))
print("Minimum goals:", min(goals_by_distance))

rates = [
    sum(near) / len(near) * 100,
    sum(mid) / len(mid) * 100,
    sum(far) / len(far) * 100,
]
print("Distances (m):", distances_m)
print("Success rates (%):", rates)

# Step 5. Make the chart
import matplotlib.pyplot as plt

plt.figure(figsize=(7, 4.5))
bars = plt.bar(['3 m', '6 m', '9 m'], rates,
               color=['#147D78', '#E98664', '#89B6B6'])
plt.ylabel('Success rate (%)')
plt.ylim(0, 100)

# Provided chart scaffolding
plt.xlabel('Shot distance')
plt.title('Invented practice data: 5 attempts per distance')
plt.yticks([0, 20, 40, 60, 80, 100])
plt.gca().bar_label(bars, labels=[f'{value:.0f}%' for value in rates], padding=5)
plt.gca().set_axisbelow(True)
plt.grid(axis='y', alpha=0.2)
plt.tight_layout()
plt.savefig(Path(__file__).with_name('success_by_distance.png'), dpi=180)
plt.show()

# Step 6. One-change challenge
edited_shots = shots.copy()
edited_shots[-1] = 1
print(sum(edited_shots) / len(edited_shots) * 100)

# Step 7. Optional extension
extra_shots = shots.copy()
extra_shots.append(1)
print(f"{sum(extra_shots) / len(extra_shots) * 100:.1f}%")

# Step 8. Save your research sentence
prediction_check = "My prediction was ___; the chart shows ___."
evidence = "In these invented data, ___ m: ___/___ = ___%."
limitation = "This does not prove ___, because ___."
print(prediction_check)
print(evidence)
print(limitation)

