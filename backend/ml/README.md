# Madam Lee's models (A-105)

Two models learn Madam Lee's routine from her own (simulated) history. Their output replaces
typed-in seed values.

| Model | Learns | Replaces |
|---|---|---|
| Quiet Gap Model | how long she normally goes without water, by time of her last use | `usual_quiet_gap_seconds` |
| Outing Model | how long she is normally out, by card tap-out time and day | `usual_outing_seconds` |

```bash
cd backend
pip install -r ml/requirements.txt
python -m ml.train_quiet_gap   # writes shared/ml/A-105_quiet_gap.json and prints a report
python -m ml.train_outing      # writes shared/ml/A-105_outing.json and prints a report
python -m pytest ml
```

- `simulate.py`: 8 weeks of simulated water use, outings (morning walk, Tue/Sat market,
  Thursday centre, evening walk), an away weekend and two meter outages.
- `common.py`: helpers both models share.
- `train_quiet_gap.py`, `train_outing.py`: train on weeks 1-6, test on weeks 7-8, export the
  learned limits. Retrain both after changing `simulate.py`.

On Reset Demo the backend reads each file at the scene time set in `shared/seed.json` and turns
it into demo seconds (`backend/app/learned_baseline.py`). The history is simulated, not
measured data. The running app only reads the exported JSON.
