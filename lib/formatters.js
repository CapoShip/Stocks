// lib/formatters.js

export const formatNumber = (num) => {
  if (!num && num !== 0) return '-';
  const n = parseFloat(num);
  if (Number.isNaN(n)) return '-';
  if (n >= 1.0e12) return (n / 1.0e12).toFixed(2) + 'T';
  if (n >= 1.0e9) return (n / 1.0e9).toFixed(2) + 'B';
  if (n >= 1.0e6) return (n / 1.0e6).toFixed(2) + 'M';
  return n.toFixed(2);
};

export const formatSigned = (num) => {
  if (num === undefined || num === null) return '0.00';
  const n = parseFloat(num);
  if (Number.isNaN(n)) return '0.00';
  return (n > 0 ? '+' : '') + n.toFixed(2);
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) return 'Récemment';
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 3600;
    if (interval > 24) {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    }
    if (interval > 1) return 'Il y a ' + Math.floor(interval) + ' h';
    interval = seconds / 60;
    if (interval > 1) return 'Il y a ' + Math.floor(interval) + ' min';
    return "À l'instant";
  } catch {
    return '';
  }
};
