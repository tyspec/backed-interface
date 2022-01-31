import { Button } from 'components/Button';
import { ethers } from 'ethers';
import { Loan } from 'types/Loan';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './LoanForm.module.css';
import { useWeb3 } from 'hooks/useWeb3';
import { ConnectWallet } from 'components/ConnectWallet';
import {
  getAccountLoanAssetAllowance,
  getAccountLoanAssetBalance,
} from 'lib/account';
import { LoanFormAwaiting } from './LoanFormAwaiting';
import { useTimestamp } from 'hooks/useTimestamp';
import { LoanFormBetterTerms } from './LoanFormBetterTerms';
import { LoanFormRepay } from './LoanFormRepay';
import { LoanFormEarlyClosure } from './LoanFormEarlyClosure';
import { LoanFormSeizeCollateral } from './LoanFormSeizeCollateral';
import { UseFormReturn } from 'react-hook-form';
import { LoanFormData } from './LoanFormData';

type LoanFormProps = {
  form: UseFormReturn<LoanFormData>;
  loan: Loan;
  refresh: () => void;
};
export function LoanForm({ form, loan, refresh }: LoanFormProps) {
  const { account } = useWeb3();
  const timestamp = useTimestamp();
  const [formOpen, setFormOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [needsAllowance, setNeedsAllowance] = useState(true);
  const toggleForm = useCallback(() => setFormOpen((prev) => !prev), []);
  const viewerIsBorrower = useMemo(
    () => account?.toUpperCase() === loan.borrower.toUpperCase(),
    [account, loan.borrower],
  );
  const buttonText = useMemo(() => {
    if (viewerIsBorrower) {
      return 'Repay loan & claim NFT';
    }
    if (loan.lastAccumulatedTimestamp.eq(0)) {
      return 'Lend';
    }
    return 'Offer better terms';
  }, [loan.lastAccumulatedTimestamp, viewerIsBorrower]);

  useEffect(() => {
    if (account) {
      Promise.all([
        getAccountLoanAssetBalance(
          account,
          loan.loanAssetContractAddress,
          ethers.BigNumber.from(loan.loanAssetDecimals),
        ),
        getAccountLoanAssetAllowance(account, loan.loanAssetContractAddress),
      ]).then(([balance, allowanceAmount]) => {
        setBalance(balance);
        setNeedsAllowance(allowanceAmount.lt(loan.loanAmount));
      });
    }
  }, [
    account,
    loan.loanAssetContractAddress,
    loan.loanAssetDecimals,
    loan.loanAmount,
  ]);

  if (loan.closed) {
    return null;
  }

  if (!account) {
    return (
      <div className={styles.form}>
        <ConnectWallet />
      </div>
    );
  }

  if (
    !loan.lastAccumulatedTimestamp.eq(0) &&
    loan.lastAccumulatedTimestamp
      .add(loan.durationSeconds)
      .lte(timestamp || 0) &&
    account.toLowerCase() === loan.lender?.toLowerCase()
  ) {
    if (account.toUpperCase() === loan.lender?.toUpperCase()) {
      return (
        <div className={styles.form}>
          <LoanFormSeizeCollateral loan={loan} refresh={refresh} />
        </div>
      );
    }
    return null;
  }

  if (
    loan.lastAccumulatedTimestamp.eq(0) &&
    account.toUpperCase() === loan.borrower.toUpperCase()
  ) {
    // This form is just a button, so it doesn't need the form toggling logic below.
    return (
      <div className={styles.form}>
        <LoanFormEarlyClosure loan={loan} refresh={refresh} />
      </div>
    );
  }

  if (!formOpen) {
    return (
      <div className={styles.form}>
        <Button onClick={toggleForm}>{buttonText}</Button>
      </div>
    );
  }

  if (loan.lastAccumulatedTimestamp.eq(0)) {
    return (
      <div className={styles.form}>
        <LoanFormAwaiting
          loan={loan}
          form={form}
          needsAllowance={needsAllowance}
          setNeedsAllowance={setNeedsAllowance}
          refresh={refresh}
        />
      </div>
    );
  }

  if (viewerIsBorrower) {
    return (
      <div className={styles.form}>
        <LoanFormRepay
          loan={loan}
          balance={balance}
          needsAllowance={needsAllowance}
          setNeedsAllowance={setNeedsAllowance}
          refresh={refresh}
        />
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <LoanFormBetterTerms
        loan={loan}
        form={form}
        needsAllowance={needsAllowance}
        setNeedsAllowance={setNeedsAllowance}
        refresh={refresh}
      />
    </div>
  );
}
