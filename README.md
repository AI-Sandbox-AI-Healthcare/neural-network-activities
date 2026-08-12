# Neural Network Activities

An interactive, browser-based set of hands-on activities for a neural networks course (ISTA 457 / INFO 557). Each activity turns a specific concept from the course into a small, guided exercise — fill in a computation, drag a slider, wire up a graph, answer a check-for-understanding question — with live feedback instead of a static worksheet.

## Purpose

Lecture and textbook material on things like backprop, regularization, or attention can be hard to internalize from equations alone. These activities let a student:

- Work through a concrete numeric example (e.g. compute an actual gradient table by hand, then check it)
- Manipulate a parameter and watch the consequence immediately (e.g. drag a stop-epoch slider and watch train/val loss curves)
- Get instant right/wrong feedback with a hint, instead of finding out at grading time
- See a running "✓ Completed" badge per activity, so both the student and instructor can tell what's done

## The activities

38 activities, grouped by course chapter:

**Prerequisite**
- 0.0 · Neuron Explorer — weighted sum + ReLU

**Chapter 6 — Feedforward Networks & Training**
- 6.1 · Bias Absorption — merge W and c into one matrix multiply
- 6.2.1 · Cross-Entropy — J(W) matrix view
- 6.2.2 · Sigmoid CE Cost — cost curve explorer
- 6.2.3 · Sigmoid vs Softmax — independent vs. competing outputs
- 6.3 · Maxout Units — simulate ReLU and \|x\|
- 6.4 · Linear Regions — counting regions of a deep ReLU network
- 6.5.1 · Computational Graph — build a GRU-like DAG
- 6.5.2 · Backprop Table — `build_grad` step-by-step

**Chapter 7 — Regularization**
- 7.1 · Regularization Race — L1 vs L2
- 7.8 · Early Stopping — when to stop training
- 7.12 · Input Dropout — beyond hidden layers
- 7.KD · KD Regularizer — taxonomy-aware regularization

**Chapter 8 — Optimization**
- 8.1 · Surrogate Loss — when the true loss isn't trainable
- 8.2 · Gradient Norm — reading the loss landscape
- 8.3 · Momentum SGD — velocity accumulation
- 8.4 · Transfer Learning — reusing pre-trained features
- 8.5 · Optimizer Race — SGD vs AdaGrad vs Adam
- 8.7.1 · Batch Norm — controlling column means

**Chapter 9 — Convolutional Networks**
- 9.1 · Cross-Correlation — slide the kernel, fill the output
- 9.3 · Adaptive Pooling — fixed output size for any input
- 9.GC.1 · GCN Mechanics — graph, adjacency matrix, message passing
- 9.GC.2 · Conv vs GCN — can graph convolution replace image convolution?

**Chapter 10 — Sequence Models**
- 10.1.1 · Conv Sentiment — window size & negation
- 10.1.2 · RNN Forward — step-by-step h(t) trace
- 10.2.1 · RNN Designer — word to sequence
- 10.2.2 · Tanh Saturation — vanishing gradients in BPTT
- 10.3 · Bi-RNN Equations — forward, backward & output
- 10.4 · NER as Seq2Seq — token classification vs. generation
- 10.6 · Recursive NNs — beyond language trees
- 10.7 · Linear RNN Stability — unrolling, w vs u
- 10.10 · GRU vs LSTM — architecture search space
- 10.TF · Transformer Positional Encoding — beyond sinusoids

**Chapter 11 — Evaluation & Interpretability**
- 11.1 · Cancer Registrar NLP — metrics for high-stakes classification
- 11.3 · Learning Curves — bias vs. variance diagnosis
- 11.4 · Hyperband — bracket search budget
- 11.LS · LIME for EEG — neighborhoods in time-series
- 11.GA · Gradient Attribution — saliency vs LIME vs SHAP

Each activity's URL is `/app#<number>`, e.g. `/app#6.4` opens Linear Regions directly.

## How it works

- `backend/static/list.html` — the landing page listing every activity as a card, grouped by chapter
- `backend/static/index.html` — the single-page app containing all 38 activities (one `tab-panel` per activity, shown/hidden by URL hash)
- `backend/main.py` — a small FastAPI server that serves those static files and accepts activity submissions

> `frontend/` is an early React/Vite prototype that predates the current static-HTML app. It isn't served by `backend/main.py` and isn't needed to run the activities — safe to ignore.

## Running locally

**Requirements:** Python 3.

1. Install dependencies:
   ```
   pip install -r backend/requirements.txt
   ```
2. Start the server:
   ```
   .\start.bat
   ```
   (PowerShell requires the `.\` prefix to run a script from the current directory.)

   or, equivalently, from the `backend/` folder:
   ```
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
3. Open **http://localhost:8000** in a browser — this shows the activity list. Click a card, or go directly to `http://localhost:8000/app#<activity-number>` (e.g. `#7.1`).
