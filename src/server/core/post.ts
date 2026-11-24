import { reddit } from '@devvit/web/server';
import { getCaseNumber, getUtcDateStr } from './caseGenerator';

export const createDailyPost = async () => {
  const dateStr = getUtcDateStr();
  const caseStr = String(getCaseNumber(dateStr)).padStart(3, '0');
  return await reddit.submitCustomPost({
    title: `Turing Border: Daily Check #${caseStr} (${dateStr}) — Pass or Purge?`,
  });
};
