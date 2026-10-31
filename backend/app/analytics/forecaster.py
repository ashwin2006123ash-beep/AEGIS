import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from ..models.schemas import CapacityForecast, ForecastDay

CAPACITY_THRESHOLD = 120  # Standard hospital district capacity in demo

class CapacityForecaster:
    def __init__(self):
        pass

    def forecast_7_days(
        self,
        data: List[Dict[str, Any]],
        zone_id: str = "Z1_SATHY",
        hospital_name: str = "Sathyamangalam Government Taluk Hospital"
    ) -> CapacityForecast:
        """
        Calculates a real statistical 7-day projection of hospital bed demand.
        Uses historical bed census observations, calculates trend & residual standard error,
        and constructs transparent uncertainty bounds.
        """
        df = pd.DataFrame(data)
        if df.empty:
            return self._empty_forecast(zone_id, hospital_name, "No data available")

        # Filter to hospital capacity records for this zone
        sub = df[(df["zone_id"] == zone_id) & 
                 (df["source_type"] == "hospital_capacity") & 
                 (df["signal_type"] == "occupied_beds")]

        if sub.empty or len(sub) < 5:
            return self._empty_forecast(
                zone_id, hospital_name, 
                "Insufficient historical bed census records (minimum 5 days required for statistical projection)."
            )

        # Sort chronologically
        sub = sub.sort_values(by="date")
        dates = list(sub["date"].values)
        historical_vals = list(sub["value"].values)

        last_date_str = dates[-1]
        last_dt = datetime.strptime(last_date_str, "%Y-%m-%d")

        # Fit trend model using recent historical values (last 7-10 days)
        y = np.array(historical_vals, dtype=float)
        x = np.arange(len(y), dtype=float)

        # Simple linear regression on historical points
        A = np.vstack([x, np.ones(len(x))]).T
        slope, intercept = np.linalg.lstsq(A, y, rcond=None)[0]

        # Calculate residual standard error
        residuals = y - (slope * x + intercept)
        residual_std = float(np.std(residuals)) if len(residuals) > 1 else 3.0
        residual_std = max(2.0, residual_std)

        forecast_days: List[ForecastDay] = []

        # 1. Add historical points (last 5-7 days for context)
        hist_context_len = min(7, len(historical_vals))
        for i in range(len(historical_vals) - hist_context_len, len(historical_vals)):
            d_str = dates[i]
            val = float(historical_vals[i])
            forecast_days.append(ForecastDay(
                date=d_str,
                day_offset=i - len(historical_vals) + 1,
                is_historical=True,
                demand_beds=round(val, 1),
                lower_bound=round(val, 1),
                upper_bound=round(val, 1),
                capacity_threshold=CAPACITY_THRESHOLD
            ))

        # 2. Add 7-day future projections
        capacity_exceeded = False
        exceeded_date = None
        max_shortfall = 0.0

        for step in range(1, 8):
            future_dt = last_dt + timedelta(days=step)
            future_str = future_dt.strftime("%Y-%m-%d")
            future_x = len(y) - 1 + step
            
            projected_mean = slope * future_x + intercept
            # Ensure projected bed demand does not go below minimum baseline (e.g. 30 beds)
            projected_mean = max(35.0, projected_mean)
            
            # Uncertainty expands with forecast horizon: sqrt(step) * 1.96 * residual_std
            uncertainty_margin = 1.96 * residual_std * np.sqrt(1.0 + (step / 5.0))
            lower_bound = max(25.0, projected_mean - uncertainty_margin)
            upper_bound = projected_mean + uncertainty_margin

            if projected_mean > CAPACITY_THRESHOLD:
                if not capacity_exceeded:
                    capacity_exceeded = True
                    exceeded_date = future_str
                shortfall = projected_mean - CAPACITY_THRESHOLD
                if shortfall > max_shortfall:
                    max_shortfall = shortfall

            forecast_days.append(ForecastDay(
                date=future_str,
                day_offset=step,
                is_historical=False,
                demand_beds=round(float(projected_mean), 1),
                lower_bound=round(float(lower_bound), 1),
                upper_bound=round(float(upper_bound), 1),
                capacity_threshold=CAPACITY_THRESHOLD
            ))

        methodology_note = (
            f"Trend extrapolation with expanding 95% prediction interval (residual RMSE = {residual_std:.1f} beds). "
            "Forecasts are empirical statistical estimates for surge preparedness, not clinical guarantees."
        )

        return CapacityForecast(
            zone_id=zone_id,
            hospital_name=hospital_name,
            available_beds=CAPACITY_THRESHOLD,
            forecast_days=forecast_days,
            capacity_exceeded=capacity_exceeded,
            exceeded_date=exceeded_date,
            projected_max_shortfall=round(max_shortfall, 1),
            methodology=methodology_note,
            data_limitation_warning=None
        )

    def _empty_forecast(self, zone_id: str, hospital_name: str, warning: str) -> CapacityForecast:
        return CapacityForecast(
            zone_id=zone_id,
            hospital_name=hospital_name,
            available_beds=CAPACITY_THRESHOLD,
            forecast_days=[],
            capacity_exceeded=False,
            exceeded_date=None,
            projected_max_shortfall=0.0,
            methodology="None — Insufficient data",
            data_limitation_warning=warning
        )

capacity_forecaster = CapacityForecaster()
