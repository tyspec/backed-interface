import { ethers } from 'ethers';
import React, { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { Input } from 'components/Input';
import { formattedAnnualRate } from 'lib/interest';
import { MessageWithTooltip } from 'components/MessageWithTooltip';

const SECONDS_IN_YEAR = 31_536_000;
const INTEREST_RATE_PERCENT_DECIMALS = 8;
const MIN_RATE = 1 / (10 ** INTEREST_RATE_PERCENT_DECIMALS);

export default function InterestRateInput({
  maxPerSecondRate,
  setInterestRate,
}) {
  const [error, setError] = useState('');
  const [maxInterestRate] = useState(maxPerSecondRate);
  const [actualRate, setActualRate] = useState(ethers.BigNumber.from('0'));

  const handleChange = useCallback(({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
    setError('');

    if (value === '') {
      setInterestRate(ethers.BigNumber.from(0));
      setActualRate(ethers.BigNumber.from('0'));
      return;
    }

    const valueAsFloat = parseFloat(value);
    if (valueAsFloat < 0) {
      setError('Rate cannot be negative');
      return;
    }

    const interestRatePerSecond = ethers.BigNumber.from(
      Math.floor(valueAsFloat * (10 ** INTEREST_RATE_PERCENT_DECIMALS)),
    ).div(SECONDS_IN_YEAR);

    setActualRate(interestRatePerSecond);

    if (interestRatePerSecond.gt(maxInterestRate)) {
      setInterestRate(ethers.BigNumber.from(0));
      setError(
        `Must be less than or equal to ${formattedAnnualRate(
          maxPerSecondRate,
        )}%`,
      );
      return;
    }

    if (valueAsFloat < MIN_RATE && valueAsFloat !== 0) {
      setInterestRate(ethers.BigNumber.from(0));
      setError(`Minimum rate ${MIN_RATE}%`);
      return;
    }

    setInterestRate(interestRatePerSecond);
  }, [maxInterestRate, maxPerSecondRate, setInterestRate]);

  const message = useMemo(() => {
    if (actualRate.eq(0)) {
      return null;
    }

    return (
      <MessageWithTooltip
        message={`actual annual rate: ${formattedAnnualRate(actualRate)} % APR`}
        content={
          <p>
            The pawn shop contract stores the interest rate as interest per second.
            When the rate is stored per second on submit and converted back to annual
            for display, it will vary slightly from what you input.
          </p>
        }
      />
    )
  }, [actualRate]);

  return (
    <div>
      <Input
        type="number"
        title="annual interest rate"
        placeholder={`Max: ${formattedAnnualRate(maxPerSecondRate)}%`}
        error={error}
        onChange={handleChange}
        message={message}
      />
    </div>
  );
}
