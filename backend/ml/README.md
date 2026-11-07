# Quiet Gap Model (Madam Lee, A-105)

Learns how long Madam Lee normally goes without using water, for each time of day, from her
own (simulated) history. Its output replaces the typed-in `usual_quiet_gap_seconds`.

```bash
cd backend
pip install -r ml/requirements.txt
python -m ml.train_quiet_gap   # writes shared/ml/A-105_quiet_gap.json and prints a report
python -m pytest ml
```

- `simulate.py`: 8 weeks of simulated water use, outings, an away weekend and two meter outages.
- `train_quiet_gap.py`: trains on weeks 1-6, tests on weeks 7-8, exports the learned limits.

The history is simulated, not measured data. The running app only reads the exported JSON.
