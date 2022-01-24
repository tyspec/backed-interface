import {
  AllowButton,
  CompletedButton,
  TransactionButton,
} from 'components/Button';
import { ethers } from 'ethers';
import { Field, Formik } from 'formik';
import { useLoanUnderwriter } from 'hooks/useLoanUnderwriter';
import { secondsBigNumToDays } from 'lib/duration';
import { formattedAnnualRate } from 'lib/interest';
import { Loan } from 'types/Loan';
import React, { useMemo } from 'react';
import styles from './LoanForm.module.css';
import { Input } from 'components/Input';
import { FormErrors } from 'components/FormErrors';

type LoanFormBetterTermsProps = {
  loan: Loan;
  balance: number;
  needsAllowance: boolean;
  setNeedsAllowance: (value: boolean) => void;
  refresh: () => void;
};
export function LoanFormBetterTerms({
  loan,
  balance,
  needsAllowance,
  setNeedsAllowance,
  refresh,
}: LoanFormBetterTermsProps) {
  const initialAmount = useMemo(
    () =>
      parseFloat(
        ethers.utils.formatUnits(loan.loanAmount, loan.loanAssetDecimals),
      ),
    [loan.loanAmount, loan.loanAssetDecimals],
  );
  const initialInterestRate = useMemo(
    () => parseFloat(formattedAnnualRate(loan.perSecondInterestRate)),
    [loan.perSecondInterestRate],
  );
  const initialDuration = useMemo(
    () => secondsBigNumToDays(loan.durationSeconds),
    [loan.durationSeconds],
  );

  const { underwrite, transactionPending, txHash } = useLoanUnderwriter(
    loan,
    refresh,
  );

  return (
    <Formik
      initialValues={{
        amount: initialAmount,
        interestRate: initialInterestRate,
        duration: initialDuration,
      }}
      validateOnBlur={false}
      validateOnChange={false}
      validateOnMount={false}
      validate={({ amount, duration, interestRate }) => {
        const isValidAmount = amount >= initialAmount;
        const isValidDuration = duration >= initialDuration;
        const isValidInterestRate = interestRate <= initialInterestRate;
        const hasTenPercentImprovement =
          amount >= initialAmount + initialAmount * 0.1 ||
          duration >= initialDuration + initialDuration * 0.1 ||
          interestRate <= initialInterestRate - initialInterestRate * 0.1;

        const errors: { [key: string]: string } = {};
        if (!isValidAmount) {
          errors.amount = `Amount must be at least ${initialAmount}, and at most your current balance of ${balance}`;
        }
        if (!isValidDuration) {
          errors.duration = `Duration must be at least ${initialDuration}`;
        }
        if (!isValidInterestRate) {
          errors.interestRate = `Interest rate must at most ${initialInterestRate}`;
        }

        if (
          isValidAmount &&
          isValidDuration &&
          isValidInterestRate &&
          !hasTenPercentImprovement
        ) {
          errors.form = `At least one value must be a 10% improvement over the current terms.`;
        }

        return errors;
      }}
      onSubmit={underwrite}>
      {(formik) => (
        <form
          className={styles.form}
          onSubmit={formik.handleSubmit}
          autoComplete="off">
          <CompletedButton buttonText="Offer better terms" />

          <label htmlFor="amount">
            <span>Amount</span>
            <Field
              name="amount"
              as={Input}
              color="dark"
              type="number"
              unit={loan.loanAssetSymbol}
            />
          </label>

          <label htmlFor="duration">
            <span>Duration</span>
            <Field
              name="duration"
              as={Input}
              color="dark"
              type="number"
              unit="Days"
            />
          </label>

          <label htmlFor="interestRate">
            <span>Interest Rate</span>
            <Field
              name="interestRate"
              as={Input}
              color="dark"
              type="number"
              unit="%"
            />
          </label>

          <FormErrors errors={Object.values(formik.errors)} />
          <AllowButton
            contractAddress={loan.loanAssetContractAddress}
            symbol={loan.loanAssetSymbol}
            callback={() => setNeedsAllowance(false)}
            done={!needsAllowance}
          />
          <TransactionButton
            text="Lend"
            type="submit"
            txHash={txHash}
            isPending={transactionPending}
            disabled={needsAllowance}
          />
        </form>
      )}
    </Formik>
  );
}
