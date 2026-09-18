# Python Trial Lab — invented soccer data for practice.
# Run ONE round at a time. Round 4 contains a deliberate bug.

# ROUND 1: Make it yours
print("Welcome to Soccer Lab!")

# ROUND 2: Predict a score
goals = 3
attempts = 5
rate = goals / attempts * 100
print("Goal rate:", rate, "%")

# ROUND 3: Let the list count
shots = [1, 0, 1, 1, 0]
goals = sum(shots)
attempts = len(shots)
rate = goals / attempts * 100
print("Goals:", goals)
print("Attempts:", attempts)
print("Goal rate:", round(rate, 1), "%")

# ROUND 4: Fix it, then test a new shot
shots = [1, 0, 1, 1, 0]
goals = sum(shots)
attempts = len(shots)
rate = goal / attempts * 100
print("Goals:", goals)
print("Attempts:", attempts)
print("Goal rate:", round(rate, 1), "%")

# ROUND 5: Compare fairly
import matplotlib.pyplot as plt
# Edit the shot lists. 1 = goal; 0 = miss.
near = [1, 0, 1, 1, 0]
far = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1]
near_rate = sum(near) / len(near) * 100
far_rate = sum(far) / len(far) * 100
print("3 m:", sum(near), "goals /", len(near), "attempts;", round(near_rate, 1), "%")
print("9 m:", sum(far), "goals /", len(far), "attempts;", round(far_rate, 1), "%")
# Provided chart scaffold: use it; no need to memorize it.
plt.bar(["3 m", "9 m"], [near_rate, far_rate])
plt.ylim(0, 100)
plt.ylabel("Goal rate (%)")
plt.show()

# ROUND 6: Run your own mini experiment
import matplotlib.pyplot as plt
experiment = "My soccer experiment"
baseline = [1, 0, 1, 1, 0]
test = [1, 0, 1, 1, 0]
baseline_rate = sum(baseline) / len(baseline) * 100
test_rate = sum(test) / len(test) * 100
print(experiment)
print("Baseline:", sum(baseline), "goals /", len(baseline), "attempts;", round(baseline_rate, 1), "%")
print("My test:", sum(test), "goals /", len(test), "attempts;", round(test_rate, 1), "%")
# Provided chart scaffold.
plt.bar(["Baseline", "My test"], [baseline_rate, test_rate])
plt.ylim(0, 100)
plt.ylabel("Goal rate (%)")
plt.show()

# ROUND 7: Show what you found
