import { RateForecast } from "./RateForecast";

interface AIInsightsProps {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  onCreateAlert?: (threshold: number) => void;
}

export function AIInsights({ fromCurrency, toCurrency, amount, onCreateAlert }: AIInsightsProps) {
  return (
    <RateForecast 
      fromCurrency={fromCurrency}
      toCurrency={toCurrency}
      amount={amount}
      onCreateAlert={onCreateAlert}
    />
  );
}
