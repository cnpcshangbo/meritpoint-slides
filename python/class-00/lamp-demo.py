"""Class 0: real Python, simulated brightness, no hardware. Run: python3 lamp-demo.py"""


def draft(brightness):
    return "Lamp ON" if brightness <= 30 else "Lamp OFF"


def repaired(brightness):
    return "Lamp ON" if brightness < 30 else "Lamp OFF"


if __name__ == "__main__":
    print("Classroom-made draft; not a transcript of an AI response.")
    print("Requirement: below 30 ON; 30 or above OFF.")
    print("Simulated inputs from 0 to 100; no real hardware.")
    input("Write predictions for 10, 50, 30. Press Enter to reveal draft results. ")
    for value in [10, 50, 30]:
        print(value, draft(value))
    input("Explain and repair the boundary. Press Enter to check the repair. ")
    for value in [10, 50, 30, 0, 100]:
        print(value, repaired(value))
