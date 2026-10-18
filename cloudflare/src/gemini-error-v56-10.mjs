/* V56.10: classify non-2xx Gemini failures without exposing upstream text.
 * Never log or return prompts, conversation history, API keys or raw error body.
 */
export function classifyGemini400(message) {
  const safe=typeof message==='string'?message.slice(0,2400):'';
  if(/multiturn.*alternate|alternate.*user.*model|first.*turn.*user|function call turns.*user/i.test(safe))
    return {code:'gemini-turn-format',
      message:'Gemini từ chối thứ tự lượt user/model (HTTP 400). DUDU đã cập nhật cách ghép ngữ cảnh; hãy thử lại sau khi Worker được triển khai.'};
  // V57.1: distinguish common Google HTTP 400 causes without returning
  // Google's raw error, which may include private prompt fragments.
  if(/(?:api[_ ]?key[_ ]?invalid|api key not valid|invalid api key|api_key_invalid)/i.test(safe))
    return {code:'gemini-invalid-key',
      message:'Google từ chối API key Gemini (HTTP 400). Quản trị viên cần kiểm tra Secret của Worker.'};
  if(/(?:temperature|top[_ ]?p|top[_ ]?k|thinking[_ ]?(?:budget|level)|generation.?config|unsupported (?:parameter|field)|unknown (?:name|field))/i.test(safe))
    return {code:'gemini-invalid-parameters',
      message:'Gemini từ chối tham số tạo nội dung (HTTP 400). Cần kiểm tra generationConfig; tin nhắn được giữ lại.'};
  if(/(?:model .*(?:not found|not available|not supported|unsupported)|(?:invalid|unsupported) model|model.*does not support)/i.test(safe))
    return {code:'gemini-model-request',
      message:'Gemini từ chối model hoặc endpoint (HTTP 400). Kiểm tra ID model và quyền sử dụng.'};
  if(/contents.*(empty|not specified|invalid)|parts.*(missing|required)|invalid.*role/i.test(safe))
    return {code:'gemini-content-format',
      message:'Gemini từ chối nội dung hoặc vai trò tin nhắn (HTTP 400). Hãy gửi lại lượt cuối.'};
  if(/context window|token limit|too many tokens|input.*length|too large/i.test(safe))
    return {code:'gemini-context-limit',
      message:'Gemini từ chối độ dài ngữ cảnh (HTTP 400). DUDU cần rút gọn lịch sử gửi đi, không xóa hội thoại.'};
  return {code:'invalid-upstream-request',
    message:'Gemini từ chối yêu cầu (HTTP 400), chưa xác định lỗi định dạng hay tham số model. Tin nhắn được giữ lại.'};
}
