// Three beginner-friendly challenges. `code` is pre-highlighted HTML.
export const CHALLENGES = [
  {
    tag: "Strings",
    color: "pink",
    question: "What will this code print?",
    code: `<span class="k">print</span>(<span class="s">"Hi"</span> + <span class="s">" "</span> + <span class="s">"Coder!"</span>)`,
    answers: ["Hi Coder!", "HiCoder!", '"Hi" + "Coder!"', "An error"],
    correct: 0,
    hint: "The + sign glues pieces of text together — and \" \" is a space!",
    explain: "Adding strings joins them in order: \"Hi\", then a space, then \"Coder!\" → Hi Coder!",
  },
  {
    tag: "Binary",
    color: "grape",
    question: "Which letter is this bracelet code?",
    beads: "01000010",
    answers: ["A", "B", "C", "Z"],
    correct: 1,
    hint: "A is 01000001. Each letter after it adds 1.",
    explain: "A is 01000001, so one more is 01000010 — that's B! Try it in the Create tab.",
  },
  {
    tag: "Loops",
    color: "sunny",
    question: "How many stars will this print?",
    code: `<span class="k">for</span> i <span class="k">in</span> <span class="k">range</span>(<span class="n">3</span>):\n    <span class="k">print</span>(<span class="s">"⭐"</span>)`,
    answers: ["1", "2", "3", "4"],
    correct: 2,
    hint: "range(3) counts 0, 1, 2. How many numbers is that?",
    explain: "range(3) gives 0, 1, 2 — three turns — so the loop prints ⭐ three times.",
  },
];
