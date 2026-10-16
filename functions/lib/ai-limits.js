'use strict';
const MAX_USER_DAILY = 25;
const MAX_GLOBAL_DAILY = 200;
const MIN_INTERVAL_MS = 10000;
const MAX_INPUT_CHARS = 12000;
const LEASE_MS = 45000;

function dayUTC(timeMs) {
  return new Date(timeMs).toISOString().slice(0, 10);
}
function validText(text, maxLength) {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= maxLength;
}
function validateRequest(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (!['chat', 'assist'].includes(data.purpose)) return null;
  if (!validText(data.instruction, 3000)) return null;
  if (!Array.isArray(data.messages) || data.messages.length < 1 || data.messages.length > 12) return null;
  let total = data.instruction.length;
  const messages = [];
  for (const message of data.messages) {
    if (!message || typeof message !== 'object' || !['user', 'model'].includes(message.role) ||
        !validText(message.text, 10000)) return null;
    total += message.text.length;
    messages.push({role:message.role,parts:[{text:message.text}]});
  }
  if (total > MAX_INPUT_CHARS || messages.at(-1).role !== 'user') return null;
  return {purpose:data.purpose,systemInstruction:{parts:[{text:data.instruction}]},contents:messages};
}
function quotaFailure(user, global, now) {
  if (Number(user?.calls || 0) >= MAX_USER_DAILY) return 'daily-user';
  if (Number(global?.calls || 0) >= MAX_GLOBAL_DAILY) return 'daily-global';
  if (Number(user?.activeUntil || 0) > now) return 'in-flight';
  if (now - Number(user?.lastAt || 0) < MIN_INTERVAL_MS) return 'cooldown';
  return null;
}
module.exports={MAX_USER_DAILY,MAX_GLOBAL_DAILY,MIN_INTERVAL_MS,MAX_INPUT_CHARS,LEASE_MS,dayUTC,validateRequest,quotaFailure};
