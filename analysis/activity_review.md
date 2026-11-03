# Activity review — 2026-11-03

Baseline reviewed: `56268b10f6d32fce479e5de149bb7a8ab6686710` on `main`.

Scope: the 38 published activities, their maintained shared source
(`backend/static/index.html`), page generation, answer feedback, and completion
conditions. The React prototype in `frontend/` is not part of the published
activity path. The Python submission API and analytics/research settings were
not changed or audited.

## Corrections

| Activity | Verified issue and correction |
|---|---|
| 6.1 Bias Absorption | Matching post-ReLU outputs alone could award completion for an unrequested scaled augmentation. Require correct shapes, the ones column, and the bias row. |
| 6.2.1 Cross-Entropy | Final vector answers alone could award completion. Require both intermediate matrices; distinguish per-class contributions from scalar cross-entropy, and distinguish the logit gradient from the parameter update and its log-base scaling. |
| 6.2.3 Sigmoid vs Softmax | Four wrong answers could award completion; wrong choices disabled both buttons. Allow retries, require all four correct answers and a score-slider/preset interaction. |
| 6.4 Linear Regions | The displayed asymptotic expression was incorrectly treated as an exact maximum. Use the elementary one-dimensional upper bound `(n+1)^l`, explain that it need not be tight, restore the missing plot and randomization control, and label the sampled region estimate without capping observations to the bound. |
| 7.8 Early Stopping | Restore the existing regularization question's missing UI and require it before completion. Expand the plot scale so the validation curve stays inside the chart. Replace the claim that training loss always decreases or can always be made arbitrarily small. |
| 7.12 Input Dropout | A single graded answer asserted which domain benefits most without evidence. Ask instead which corruption fits a concrete camera-occlusion scenario; usefulness elsewhere depends on validation. |
| 8.1 Surrogate Loss | Reported losses were formulas of thresholded precision, recall and IoU. Compute explicitly labelled toy BCE and localization losses from raw candidates and fixed training assignments; changing evaluation thresholds changes evaluation, not training loss. |
| 8.2 Gradient Norm | Norm curves were presented as uniquely identifying curvature. Explain their illustrative nature: zero first derivative is not proof of a minimum or a flat neighbourhood; combine norms with loss, update and curvature evidence. |
| 8.5 Optimizer Race | Require a simulation run for completion, provide the exact settings used by the final comparison question, and qualify claims that AdaGrad must stall or Adam always takes the best path. |
| 8.7.1 Batch Norm | Include epsilon and distinguish current training-batch statistics from running statistics used at evaluation. Revoke success feedback and Continue buttons when correct inputs are changed to incorrect values. |
| 10.7 Linear RNN | Correct the claim that every `|w| >= 1` constant-input recurrence is unbounded: `w=-1` with zero initial state oscillates between `0` and `u`, and zero forcing can remain zero. |
| 11.4 Hyperband | Remove the suggestion that rounding logarithms to a few decimal places solves the exponent-counting problem for every input. The integer-counting answer remains correct. |
| 11.GA Attribution | Clarify the sign of the negative contribution from adding “bad” first in the Shapley example. |

Shared tab activation now typesets static math in the selected panel as well as
math inserted by individual activities.

For the regions correction, a one-layer counterexample to the previous bound is
`ReLU(x) + ReLU(x-1)`: width 2 already has 3 affine output pieces. Within an
existing one-dimensional interval, each of n affine pre-activations has at most
one zero, so each layer produces at most n+1 subintervals. Repeating this gives
the conservative product bound. See [Serra, Tjandraatmadja and Ramalingam (2018)](https://proceedings.mlr.press/v80/serra18b.html)
for sharper bounds and attainability conditions. The plot's 601-point
slope-change estimate is neither an exact count nor a measurement of all regions
on the entire real line.

## Coverage and evidence

All 38 activity pages receive an initialization check and a source-aware
successful-completion path through their controls and answer handlers:

| Group | Activities |
|---|---|
| Prerequisite | 0.0 |
| Chapter 6 | 6.1, 6.2.1, 6.2.2, 6.2.3, 6.3, 6.4, 6.5.1, 6.5.2 |
| Chapter 7 | 7.1, 7.8, 7.12, 7.KD |
| Chapter 8 | 8.1, 8.2, 8.3, 8.4, 8.5, 8.7.1 |
| Chapter 9 | 9.1, 9.3, 9.GC.1, 9.GC.2 |
| Chapter 10 | 10.1.1, 10.1.2, 10.2.1, 10.2.2, 10.3, 10.4, 10.6, 10.7, 10.10, 10.TF |
| Chapter 11 | 11.1, 11.3, 11.4, 11.LS, 11.GA |

The separate dependency-free Node checks cover the catalog, CE values, Bernoulli
loss, incomplete/incorrect completion states, quiz recovery, region-bound
counterexample, threshold-independent surrogate losses, finite-difference
backprop, SGD/momentum arithmetic, the fixed optimizer comparison, convolution,
pooling, graph means, recurrent forward passes, gated accumulation, attention
permutation equivariance, classification counts, LIME solver finiteness, and
attribution completeness. Regression checks also cover stale BN feedback and
the early-stopping question's presence.

Reproduce using the commands in the README. `scripts/check_pages.py` rebuilds
into a temporary directory and compares every generated artifact. Browser
results and screenshots belong under ignored `output/playwright/`.

These are local checks on toy instructional examples. Browser completion uses
source answer keys and is not an independent mathematical proof of every answer;
the numerical checks provide independent evidence for the listed calculations.
No claim is made about student learning outcomes or a production deployment.

## Verification results

- 38/38 generated activity pages initialized and reached their completion banner
  in the local browser check, with no uncaught JavaScript or KaTeX render errors.
- 22/22 calculation and regression checks passed.
- All generated pages and shared assets matched a fresh temporary build.
- The local monolithic HTML app initialized all 38 panels and switched through
  all 38 tab routes without an uncaught JavaScript error. This check did not
  exercise the Python submission endpoint.
- Desktop screenshots were inspected for the revised linear-regions,
  early-stopping and surrogate-loss panels; the early-stopping curve was also
  checked to remain inside its plotted axes.

The browser checks exercise a successful path plus specific negative cases;
they are not an exhaustive search of every possible input or interaction.
