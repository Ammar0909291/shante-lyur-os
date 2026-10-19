"""THE REALITY TEST: final narration cues. Each cue: (scene, text, pause after in seconds). Spoken text may differ from subtitle text."""

CHAPTERS = {
    "window": "1 · The First Doubt", "build": "2 · Building a World", "archive": "3 · The Three Possibilities",
    "zoom": "4 · A Clue in Physics?", "lab": "5 · The Problem of Proof", "moments": "6 · Could a Simulation Feel?",
    "outside": "7 · Outside the Universe", "return": "8 · The Reality Test",
}

# scene, narration, pause-after
CUES = [
    ("window", "At 8:17 on an ordinary morning, imagine that the world stops.", 0.9),
    ("window", "A bird freezes in midair. Cars stand still on the road. Every sound disappears.", 2.2),
    ("window", "Then, one second later, everything carries on. No one else seems to have noticed.", 0.9),
    ("window", "What would you conclude? That your mind played a trick on you? Or that the world is not quite what you believed?", 1.6),
    ("ascend", "This is only a thought experiment. Nothing like it has ever been verified.", 0.6),
    ("ascend", "But the doubt behind it is ancient. More than two thousand years ago, the Chinese philosopher Zhuangzi dreamed he was a butterfly, and woke unsure whether he was a man who had dreamed of being a butterfly, or a butterfly now dreaming it was a man.", 0.8),
    ("ascend", "In 1641, René Descartes asked how he could be sure that a deceiving demon was not feeding him an entire false world.", 0.8),
    ("ascend", "Today, that old doubt has a modern form. Could the world we experience be running on a computer?", 1.8),

    ("build", "To see why anyone takes this seriously, imagine building a world from scratch.", 0.5),
    ("build", "Not a video game with a few scripted characters, but a world with weather, oceans, cities, and billions of inhabitants.", 0.5),
    ("build", "They study the stars, invent technologies, fall in love, and wonder how their universe began. From the inside, their world would simply be the world.", 0.9),
    ("worlds", "Now imagine that its builders can run many such worlds. Some of those worlds might even build worlds of their own.", 0.6),
    ("worlds", "If that were possible, simulated minds could vastly outnumber minds in the original reality. That is the basic intuition behind the simulation hypothesis.", 0.8),
    ("worlds", "But two large ifs are hiding in that sentence. Rendering a convincing world is not the same as creating a conscious mind. And no one has ever built a simulated civilization of conscious beings.", 1.6),

    ("archive", "In 2003, the philosopher Nick Bostrom published a paper titled, Are You Living in a Computer Simulation?", 0.6),
    ("archive", "He did not claim to have found a computer behind the universe. He made a conditional argument about the future of technological civilizations. At least one of three statements, he argued, is very likely true.", 0.9),
    ("archive", "One. Almost all civilizations at our stage go extinct before they can run vast numbers of realistic simulations of their ancestors.", 0.9),
    ("archive", "Two. Civilizations that do reach that stage almost never choose to run such simulations. Perhaps they lack interest. Perhaps they consider it unethical.", 0.9),
    ("archive", "Three. Almost everyone with experiences like ours is living in a simulation.", 1.4),
    ("archive", "Why the third? If simulated people vastly outnumber real ones, and you have no evidence about which kind you are, simple counting says you should expect to be one of the many, not one of the few.", 0.8),
    ("archive", "But the argument rests on assumptions. The biggest is what Bostrom calls substrate independence: the idea that a mind could run on silicon as well as on a brain. Bostrom himself calls it not entirely uncontroversial.", 0.8),
    ("archive", "So the argument does not show that we are simulated. It shows that if its assumptions hold, one of three surprising conclusions follows. Which raises the obvious question. Is there any evidence?", 1.6),

    ("zoom", "Some people point to the universe itself. From galaxies to grains of sand, from living cells to atoms, nature follows precise mathematical laws.", 0.6),
    ("laws", "Gravity weakens with the square of distance. Light in a vacuum always travels at the same speed, two hundred and ninety-nine million, seven hundred and ninety-two thousand, four hundred and fifty-eight metres per second. Could laws like these be the code of a cosmic computer?", 0.7),
    ("laws", "It is a tempting analogy. But an analogy is not evidence. Mathematics describes patterns. That a universe can be described by equations does not tell us that a machine is calculating it.", 0.9),
    ("quantum", "Then there is quantum mechanics. Send electrons, one at a time, through a double slit, and each one arrives as a single dot.", 0.5),
    ("quantum", "But dot by dot, a pattern of stripes appears: the signature of a wave interfering with itself. This is not a metaphor. Physicists have watched it build up, one electron at a time.", 0.8),
    ("quantum", "Some compare this to a video game that renders detail only when someone looks. But in quantum physics, a measurement is a physical interaction, with a detector, an atom, even a stray photon. No human observer is required.", 0.7),
    ("quantum", "No accepted result in physics shows that reality is a simulation. The puzzles are real. They simply do not point to a computer.", 1.6),

    ("lab", "Imagine a scientist inside a perfect simulation. Every experiment gives consistent results. Every instrument agrees.", 0.6),
    ("lab", "If the simulation reproduced everything she could observe, no experiment inside it might ever reveal the truth. The walls of her world would be invisible from within.", 0.8),
    ("lab", "That is a real philosophical possibility. It is also a warning. An idea that no observation could ever test can explain anything, and so it predicts nothing.", 0.9),
    ("test", "Some physicists have tried to make the idea testable. In 2012, Silas Beane, Zohreh Davoudi and Martin Savage asked what would happen if our universe were computed on a grid, the way physicists simulate particles today.", 0.6),
    ("test", "They suggested that the highest-energy cosmic rays might reveal the grid's directions. No such pattern has been reported. And a different kind of simulation need not leave this mark at all.", 0.8),
    ("test", "So any claimed glitch in reality should face four questions. What exactly does it predict? Can it be tested? Does it rule out ordinary explanations? And can others reproduce it?", 0.8),
    ("test", "Déjà vu, coincidences and strange personal experiences do not pass that test. A compelling story can make a possibility feel real. Science asks for more.", 1.8),

    ("moments", "Suppose someone could simulate a world as rich as ours. Would the people in it actually feel anything?", 0.8),
    ("moments", "We do not know. Computers can process information and generate realistic images. Whether any machine could have genuine experiences is still an open question.", 0.6),
    ("moments", "The philosopher David Chalmers called this the hard problem of consciousness: why any physical process, in a brain or anywhere else, is accompanied by experience at all.", 0.9),
    ("mind", "But the question has consequences. If a simulated being could truly suffer, its suffering would matter, wherever it existed. If it could love, its relationships would matter to it.", 0.7),
    ("mind", "In his 2022 book Reality Plus, Chalmers argues that a simulated world would not be an illusion, but a different kind of real world.", 0.6),
    ("mind", "Whether or not he is right, it separates two questions we often confuse: where a world comes from, and whether the experiences inside it have value.", 1.6),

    ("outside", "Imagine that tomorrow, scientists found convincing evidence that our universe is simulated. It would be one of the greatest discoveries in history.", 0.6),
    ("outside", "And it would immediately raise another question. What is the reality outside ours? What laws govern the world where the computer runs?", 0.7),
    ("outside", "Could that world be simulated too? Perhaps the chain ends in a fundamental reality. Perhaps our ideas about outside do not even apply.", 0.8),
    ("outside", "Either way, the simulation hypothesis does not solve the mystery of existence. It moves it one level up. A computer might explain how our world was made. It would not explain why there is anything at all.", 2.0),

    ("return", "So, are we living in a simulation? The honest answer is that we do not know.", 0.8),
    ("return", "There is no reliable evidence that our universe is an artificial simulation. Bostrom's argument gives us a careful way to think about the possibility. Physics offers deep puzzles, but no proof. And whether a machine could ever be conscious remains unresolved.", 0.8),
    ("return", "We should not dismiss the question because it sounds strange, or accept it because it sounds extraordinary. We should investigate it, like any other claim.", 1.0),
    ("bluedot", "And if one day we learned that our world was a simulation, would the stars be any less beautiful? Would the people you love matter any less? Would curiosity lose its value?", 1.4),
    ("bluedot", "Perhaps the real test is not whether reality is simulated. It is whether we are willing to question our assumptions, follow the evidence, and admit when we do not know.", 0.9),
    ("bluedot", "The universe may be stranger than we imagine. But wonder is not proof. And uncertainty is not a reason to stop searching.", 2.5),
]

# Subtitle text where it differs from the spoken text
SUBS = {
    "two hundred and ninety-nine million, seven hundred and ninety-two thousand, four hundred and fifty-eight metres per second": "299,792,458 metres per second",
}

INTRO = 4.0     # seconds of black, clock tick and water drop before the first line
ENDCARD = 16.0  # closing questions and brand card after the last line
