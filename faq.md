# TemanMu: FAQ

### 1. What data does TemanMu use?

Only household water and electricity data, plus either a door sensor or the township's access-card taps at the lift lobby or gate. There are no cameras, no microphones and no wearables in the home.

### 2. Why TemanMu instead of CCTV or wearables?

CCTV invades privacy, and many elderly people don't want a camera in their home. Wearables must be charged, worn and pressed, and elderly people often forget or take them off to shower. TemanMu needs nothing from the elderly person, because their daily routine is the input.

### 3. How does TemanMu know a resident's usual quiet gap?

It learns from each resident's own routine. Over the first few weeks it tracks when water and electricity are normally used, and how long the quiet stretches usually last, such as overnight or during an afternoon nap. It keeps adjusting as habits change with the seasons or health. Alerts are based on that personal baseline, not on a fixed number of hours for everyone.

### 4. How does TemanMu avoid false alarms?

Alerts compare against each resident's own usual quiet gap. Before anyone is notified, a grace period starts with a call to the resident, and any water, electricity or door activity cancels it.

### 5. A door opening doesn't prove someone went out. How does TemanMu handle that?

Where the township's access cards record both tapping out and tapping in (Madam Lee's flat in the demo), we don't install a door sensor at all. Her card taps tell us she went out and came back, which a door can't:

- A tap out while the home is quiet means she is probably out.
- If she stays out much longer than usual, TemanMu raises **"Not back yet"**, and the guard looks for her outside instead of knocking on her door.
- If she taps back in but nothing is used at home soon after, TemanMu raises **"Tapped in, no activity at home"**. She may have had a problem in the lift or corridor.
- No tap at all and a quiet home is treated as inactivity at home, the safer guess.

A tap is never proof that she is safe: cards get lent and taps get missed. If water or power is in use at home, that outweighs a tap out.

Where card taps aren't available (landed houses, or lobbies you leave by pressing a button), we keep the door sensor. A door opening alone can't tell whether she left or stayed in, so we use it only to mark a possible outing when the home then goes quiet.

### 6. Water and electricity meters report with a delay. Does that slow down alerts?

Smart meters report in short intervals, not instantly, so TemanMu expects a small lag. The grace period is longer than the meter delay, so a late reading can't trigger an alert. Late readings are also placed at the time the usage actually happened, so the resident's routine isn't distorted.

### 7. Who gets alerted, and when?

If the grace period ends without activity or an answer, the caregiver and the township operator are notified together. Reminders go to both until someone taps "I'll Check Now".

### 8. Besides alerts, how does TemanMu support residents?

It also helps them stay connected. Families can request a Community Buddy, a volunteer matched by shared interests. With consent, it can also introduce a neighbour with a similar daily schedule, such as another early riser, without sharing exact times.

### 9. What is the 3D simulator?

A stand-in for a real home in this round, since no real sensors are installed yet. Clicking the tap, kettle or door sends the same data a real meter would, while the alerts, dashboard and family app all run live. In the next round, we will replace it with real sensors.

### 10. How do I try the demo system?

Open the 3D simulator, and open the township or caregiver page in another tab or window. In the simulator, click the tap, kettle or door to simulate some activity. Each action shows up live on the township and caregiver pages.
