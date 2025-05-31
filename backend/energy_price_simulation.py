import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import random
import csv

# Simulation parameters
NUM_POINTS = 14 * 48  # 14 days, 48 half-hour intervals per day
BASE_PRICE = 80  # EUR/MWh
FLUCTUATION = 10  # Max fluctuation in EUR
INTERVAL_MINUTES = 30  # Each point is 30 minutes

# Generate timestamps and prices for the last 14 days up to now
now = datetime.now()
start_time = now - timedelta(minutes=INTERVAL_MINUTES * (NUM_POINTS - 1))
times = [start_time + timedelta(minutes=INTERVAL_MINUTES * i) for i in range(NUM_POINTS)]
prices = [BASE_PRICE + random.uniform(-FLUCTUATION, FLUCTUATION) for _ in range(NUM_POINTS)]

# Add auctioning prices for up to 2 days ahead
FUTURE_POINTS = 2 * 48  # 2 days, 48 half-hour intervals per day
future_times = [times[-1] + timedelta(minutes=INTERVAL_MINUTES * (i + 1)) for i in range(FUTURE_POINTS)]
future_prices = [prices[-1] + random.uniform(-FLUCTUATION, FLUCTUATION) for _ in range(FUTURE_POINTS)]

# Save the simulated data (including future) to data.csv
with open('data.csv', 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['datetime', 'price_eur_per_mwh', 'is_future'])
    for t, p in zip(times, prices):
        writer.writerow([t.isoformat(), p, 0])
    for t, p in zip(future_times, future_prices):
        writer.writerow([t.isoformat(), p, 1])

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 9), sharex=False)

# 14-day + 2-day-ahead graph
ax1.plot(times, prices, lw=2, label='Historical/Current')
ax1.plot(future_times, future_prices, lw=2, linestyle='dashed', color='red', label='Auctioned (Next 2 Days)')
ax1.set_title("Simulated Real-Time Energy Prices in Germany (EUR/MWh) - Last 14 Days + Auction (Next 2 Days)")
ax1.set_ylabel("Price (EUR/MWh)")
ax1.set_xlim(times[0], future_times[-1])
ax1.set_ylim(min(prices + future_prices) - 5, max(prices + future_prices) + 5)
ax1.legend()
ax1.grid(True)

# Intraday graph (today only)
today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
intraday_times = [t for t in times if t >= today_midnight]
intraday_prices = prices[-len(intraday_times):] if intraday_times else []
ax2.plot(intraday_times, intraday_prices, lw=2, color='orange')
ax2.set_title("Simulated Real-Time Energy Prices in Germany (EUR/MWh) - Today")
ax2.set_xlabel("Time")
ax2.set_ylabel("Price (EUR/MWh)")
if intraday_times:
    ax2.set_xlim(intraday_times[0], intraday_times[-1])
    ax2.set_ylim(min(intraday_prices) - 5, max(intraday_prices) + 5)
ax2.grid(True)

fig.autofmt_xdate()
plt.tight_layout()
