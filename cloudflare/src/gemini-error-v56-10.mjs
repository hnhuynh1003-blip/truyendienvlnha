/* V56.10: classify non-2xx Gemini failures without exposing upstream text.
 * Never log or return prompts, conversation history, API keys or raw error body.
 */
export function classifyGemini400(message) {
  const safe=typeof message==='string'?message.slice(0,2400):'';
  if(/multiturn.*alternate|alternate.*user.*model|first.*turn.*user|function call turns.*user/i.test(safe))
    return {code:'gemini-turn-format',
      message:'Gemini từ chối thứ tự lượt user/model (HTTP 400). DUDU đã cập nhật cách ghép ngữ cảnh; hãy thử lại sau khi Worker được triển khai.'};
  if(/contents.*(empty|not specified|invalid)|parts.*(missing|required)|invalid.*role/i.test(safe))
    return {code:'gemini-content-format',
      message:'Gemini từ chối nội dung hoặc vai trò tin nhắn (HTTP 400). Hãy gửi lại lượt cuối.'};
  if(/context window|token limit|too many tokens|input.*length|too large/i.test(safe))
    return {code:'gemini-context-limit',
      message:'Gemini từ chối độ dài ngữ cảnh (HTTP 400). DUDU cần rút gọn lịch sử gửi đi, không xóa hội thoại.'};
  return {code:'invalid-upstream-request',
    message:'Gemini từ chối yêu cầu (HTTP 400), chưa xác định lỗi định dạng hay tham số model. Tin nhắn được giữ lại.'};
}
