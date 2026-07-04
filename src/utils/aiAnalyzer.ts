import { Trade, AIAnalysisReport } from '../types';

/**
 * Generates a detailed AI Review for a single trade
 */
export const generateTradeReview = (trade: Trade): AIAnalysisReport => {
  let score = 100;
  const deductions: string[] = [];
  const strengthsList: string[] = [];
  const weaknessesList: string[] = [];
  
  // 1. Analyze Risk Management
  let riskAnalysis = "Excellent risk controls. ";
  if (trade.riskPct > 2) {
    score -= 15;
    deductions.push("Risked more than 2% of account balance");
    riskAnalysis = `Aggressive risk level detected (${trade.riskPct}%). Risking more than 2% per trade exposes the account to significant drawdown risks during losing streaks. `;
    weaknessesList.push("High risk per trade");
  } else {
    strengthsList.push("Proper position sizing");
    riskAnalysis += `Position sizing is within professional standards (${trade.riskPct}% risk). This is highly sustainable for long-term equity growth. `;
  }

  if (trade.rr < 1.5 && trade.rr > 0) {
    score -= 10;
    deductions.push("Low Risk-to-Reward ratio (< 1.5)");
    riskAnalysis += `However, the reward-to-risk ratio of 1:${trade.rr} is relatively low. Aim for at least 1:2 to ensure that a single win can cover multiple losses.`;
    weaknessesList.push("Suboptimal R:R ratio");
  } else if (trade.rr >= 2) {
    strengthsList.push("High R:R ratio trade setup");
    riskAnalysis += `The reward-to-risk ratio of 1:${trade.rr} is excellent, allowing for highly profitable operations even with a 40% win rate.`;
  }

  // 2. Analyze Psychology & Emotion
  let psychologyAnalysis = "";
  const emotion = trade.emotion ? trade.emotion.toLowerCase() : 'calm';
  if (['fomo', 'greed', 'revenge', 'impatient', 'anxious'].includes(emotion)) {
    score -= 12;
    deductions.push(`Trade executed under emotional influence (${trade.emotion})`);
    psychologyAnalysis = `Emotional trading state detected: "${trade.emotion}". Entering the market with fear of missing out, greed, or revenge usually leads to chasing price, ignoring invalidation levels, or exiting early. `;
    weaknessesList.push(`Emotional execution (${trade.emotion})`);
  } else {
    strengthsList.push("Disciplined psychological state");
    psychologyAnalysis = `Trading state was "${trade.emotion}". Executing trades in a calm, objective mindset is a hallmark of professional traders and prevents impulse errors. `;
  }

  if (trade.confidence >= 8) {
    psychologyAnalysis += `Confidence level was high (${trade.confidence}/10). `;
    if (trade.status === 'Loss') {
      psychologyAnalysis += "A high-confidence loss can test discipline; remember that even a perfect setup has a probabilistic chance of failure. Avoid over-leveraging next time.";
    }
  } else if (trade.confidence <= 4) {
    score -= 8;
    deductions.push("Entered trade with low confidence");
    psychologyAnalysis += `Confidence level was low (${trade.confidence}/10). Entering trades with low conviction suggests you may be forcing setups or overtrading due to boredom.`;
    weaknessesList.push("Low conviction entry");
  }

  // 3. Analyze Mistakes & Lessons
  let mistakesAnalysis = "";
  if (trade.mistakes && trade.mistakes.length > 0) {
    score -= 10 * Math.min(trade.mistakes.length, 2);
    mistakesAnalysis = `Identified execution errors: ${trade.mistakes.join(', ')}. `;
    trade.mistakes.forEach(m => weaknessesList.push(m));
  } else {
    mistakesAnalysis = "No major execution errors flagged by the trader. Good adherence to plan. ";
    strengthsList.push("Clean plan execution");
  }

  if (trade.status === 'Loss') {
    mistakesAnalysis += "Remember, a loss is not necessarily a mistake if it was executed according to plan. However, identify if this loss is a result of market conditions or structural flaws.";
  } else {
    mistakesAnalysis += "Successful trade. Note whether the win was due to strict rule execution or simply favorable market variance.";
  }

  // 4. Analyze Patterns & Setup
  let patternAnalysis = "";
  if (trade.logic) {
    patternAnalysis = `Setup Style: ${trade.logic}. `;
  }
  if (trade.entryConfirmations && trade.entryConfirmations.length > 0) {
    patternAnalysis += `Utilized ${trade.entryConfirmations.length} confirmations: [${trade.entryConfirmations.join(', ')}]. `;
    if (trade.entryConfirmations.length >= 3) {
      strengthsList.push("Confluence-based entry");
    }
  } else {
    score -= 10;
    deductions.push("No entry confirmations selected");
    patternAnalysis += "No entry confirmations were selected. Trading without strict confluence criteria often leads to low probability entries. ";
    weaknessesList.push("Lack of entry confluences");
  }

  // Session notes
  if (trade.session === 'Overlap') {
    patternAnalysis += "Executed during the London-NY Overlap, which features the highest daily volume and momentum.";
  } else {
    patternAnalysis += `Executed during the ${trade.session} session. Note if this pair matches the active session volume.`;
  }

  // 5. Suggestions
  const suggestions: string[] = [];
  if (trade.riskPct > 2) {
    suggestions.push(`Decrease your lot size on ${trade.pair} to limit risk to 1-2% maximum.`);
  }
  if (trade.rr < 1.5) {
    suggestions.push("Refine entry criteria on LTF (Lower Timeframe) to secure a smaller Stop Loss and improve overall R:R.");
  }
  if (['fomo', 'revenge'].includes(emotion)) {
    suggestions.push("Implement a 15-minute 'cool-down' period before clicking buy/sell to verify rules objectively.");
  }
  if (!trade.entryConfirmations || trade.entryConfirmations.length < 2) {
    suggestions.push("Establish a checklist rule requiring at least 2 distinct confirmations before triggers.");
  }
  if (trade.status === 'Loss' && trade.lessons) {
    suggestions.push(`Review lessons learned: "${trade.lessons}".`);
  }
  if (suggestions.length === 0) {
    suggestions.push("Flawless trade process. Maintain this standard. Consider scaling up size slowly as consistency holds.");
  }

  // Final score formatting
  score = Math.max(10, Math.min(100, score));

  return {
    tradeId: trade.id,
    score,
    riskManagement: riskAnalysis,
    psychology: psychologyAnalysis,
    mistakes: trade.mistakes?.join(', ') || 'None',
    patterns: patternAnalysis,
    strengths: strengthsList.slice(0, 3).join(', ') || 'No notable strengths logged',
    weaknesses: weaknessesList.slice(0, 3).join(', ') || 'No notable weaknesses logged',
    suggestions: suggestions.join(' '),
    generatedAt: Date.now()
  };
};

/**
 * Generates an AI review of a group of trades (weekly or monthly portfolio)
 */
export const generatePortfolioReview = (
  trades: Trade[],
  timeframe: 'weekly' | 'monthly'
): {
  score: number;
  winRate: number;
  totalPnl: number;
  tradeCount: number;
  riskSummary: string;
  psychSummary: string;
  strengths: string;
  weaknesses: string;
  bestSetup: string;
  worstSetup: string;
  suggestions: string;
} => {
  const count = trades.length;
  if (count === 0) {
    return {
      score: 100,
      winRate: 0,
      totalPnl: 0,
      tradeCount: 0,
      riskSummary: "No trades logged in this period to evaluate risk management.",
      psychSummary: "No trades logged in this period to evaluate trading psychology.",
      strengths: "N/A",
      weaknesses: "N/A",
      bestSetup: "N/A",
      worstSetup: "N/A",
      suggestions: "Log some trades to receive your portfolio report."
    };
  }

  const wins = trades.filter(t => t.status === 'Win');
  const losses = trades.filter(t => t.status === 'Loss');
  const winRate = Math.round((wins.length / count) * 100);
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  
  // Calculate average risk
  const avgRisk = trades.reduce((sum, t) => sum + (t.riskPct || 0), 0) / count;
  const highRiskTrades = trades.filter(t => t.riskPct > 2).length;
  
  // Calculate setups
  const setups: { [key: string]: { wins: number; total: number; pnl: number } } = {};
  trades.forEach(t => {
    const setupName = t.logic || 'Unknown';
    if (!setups[setupName]) {
      setups[setupName] = { wins: 0, total: 0, pnl: 0 };
    }
    setups[setupName].total += 1;
    setups[setupName].pnl += t.pnl;
    if (t.status === 'Win') setups[setupName].wins += 1;
  });

  let bestSetup = 'N/A';
  let worstSetup = 'N/A';
  let maxPnl = -Infinity;
  let minPnl = Infinity;

  Object.entries(setups).forEach(([name, data]) => {
    if (data.pnl > maxPnl) {
      maxPnl = data.pnl;
      bestSetup = `${name} (${data.wins}/${data.total} wins, PnL: ${data.pnl.toFixed(2)})`;
    }
    if (data.pnl < minPnl) {
      minPnl = data.pnl;
      worstSetup = `${name} (${data.wins}/${data.total} wins, PnL: ${data.pnl.toFixed(2)})`;
    }
  });

  // Calculate score starting from 80
  let score = 70 + (winRate * 0.3); // Win rate factor (max +30)
  if (avgRisk > 2) score -= 15;
  if (highRiskTrades > 0) score -= (highRiskTrades * 3);
  
  // Count emotional trades
  const emotionalTrades = trades.filter(t => 
    ['fomo', 'greed', 'revenge', 'impatient'].includes(t.emotion?.toLowerCase() || '')
  ).length;
  score -= (emotionalTrades * 4);
  
  score = Math.max(10, Math.min(100, Math.round(score)));

  // Risk summary
  let riskSummary = `Across your last ${count} trades, your average risk per trade was ${avgRisk.toFixed(1)}%. `;
  if (highRiskTrades > 0) {
    riskSummary += `You breached your 2% risk threshold in ${highRiskTrades} trades. Standardizing your risk size is vital to prevent outliers from wiping out gains.`;
  } else {
    riskSummary += "Excellent capital preservation. You consistently kept your risk percentage low and protected your equity.";
  }

  // Psychology summary
  let psychSummary = `Your emotional profile shows you were calm/confident in ${count - emotionalTrades} of your ${count} trades. `;
  if (emotionalTrades > 0) {
    psychSummary += `You reported emotional interference (FOMO, Revenge, etc.) in ${emotionalTrades} trades. These trades account for a higher percentage of errors. Establish rules to block trading immediately after a loss.`;
  } else {
    psychSummary += "Great emotional discipline. Trading in a calm, analytical state of mind is highly correlated with stable performance.";
  }

  // Strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (winRate >= 50) strengths.push("Strong win-rate probability");
  if (avgRisk <= 1.5) strengths.push("Excellent risk tolerance controls");
  if (emotionalTrades === 0) strengths.push("High emotional discipline");
  if (maxPnl > 0) strengths.push("Profitable strategy execution");

  if (winRate < 45) weaknesses.push("Suboptimal win rate");
  if (highRiskTrades > 0) weaknesses.push("Inconsistent position sizing");
  if (emotionalTrades > 1) weaknesses.push("Vulnerability to FOMO / Revenge");
  if (minPnl < 0 && Math.abs(minPnl) > maxPnl) weaknesses.push("Losing setups overshadowing winners");

  // Suggestions
  const suggestionsList: string[] = [];
  if (highRiskTrades > 0) {
    suggestionsList.push("Enforce a hard limit on position size using a Risk Calculator before entry.");
  }
  if (emotionalTrades > 0) {
    suggestionsList.push("Implement a daily max loss limit. If hit, shut down your terminal to prevent revenge trading.");
  }
  if (winRate < 45) {
    suggestionsList.push("Review entry conditions. Consider narrowing focus to a single high-probability session (e.g. London).");
  }
  if (suggestionsList.length === 0) {
    suggestionsList.push("Everything looks highly professional. Continue following your trading plan and scaling your positions slowly.");
  }

  return {
    score,
    winRate,
    totalPnl,
    tradeCount: count,
    riskSummary,
    psychSummary,
    strengths: strengths.join(', ') || 'N/A',
    weaknesses: weaknesses.join(', ') || 'N/A',
    bestSetup,
    worstSetup,
    suggestions: suggestionsList.join(' ')
  };
};
