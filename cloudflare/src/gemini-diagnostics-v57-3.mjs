/* DUDU V57.3: privacy-preserving Gemini HTTP 400 diagnostics.
 * Never return or log upstream error text, request text, Firebase UID or secrets.
 */
import {classifyGemini400} from './gemini-error-v56-10.mjs';

const GOOGLE_STATUSES=new Set(['INVALID_ARGUMENT','FAILED_PRECONDITION',
  'PERMISSION_DENIED','UNAUTHENTICATED','RESOURCE_EXHAUSTED','UNKNOWN']);
const KNOWN_FIELDS=['systemInstruction','generationConfig','contents','model'];

function validStatus(value){
  return GOOGLE_STATUSES.has(value)?value:'UNSPECIFIED';
}
function fieldName(value){
  if(typeof value!=='string')return 'unknown';
  const first=value.replace(/^(?:GenerateContentRequest[.])?/,'');
  return KNOWN_FIELDS.find(f=>first===f||first.startsWith(f+'.')||first.startsWith(f+'['))||'unknown';
}
function bodyField(details){
  if(!Array.isArray(details))return 'unknown';
  for(const entry of details.slice(0,5)){
    if(entry?.['@type']!=='type.googleapis.com/google.rpc.BadRequest'||
       !Array.isArray(entry.fieldViolations))continue;
    for(const item of entry.fieldViolations.slice(0,5)){
      const field=fieldName(item?.field);
      if(field!=='unknown')return field;
    }
  }
  return 'unknown';
}
function messageField(message){
  // Check only known protocol field names, never capture content of the message.
  if(typeof message!=='string')return 'unknown';
  for(const f of KNOWN_FIELDS){
    if(new RegExp('(?:GenerateContentRequest[.])?'+f+'(?:[.\\[: ]|$)','i').test(message))
      return f;
  }
  return 'unknown';
}
function sizeBand(value){
  const n=typeof value==='string'?value.length:0;
  return n===0?'empty':n<=1000?'short':n<=3000?'medium':n<=6000?'long':'very-long';
}
export function summarizeGemini400(error,requestBody){
  const known=classifyGemini400(error?.message);
  const googleStatus=validStatus(error?.status);
  const field=bodyField(error?.details)!=='unknown'
    ?bodyField(error?.details):messageField(error?.message);
  let code=known.code,message=known.message;
  if(code==='invalid-upstream-request'&&googleStatus==='FAILED_PRECONDITION'){
    code='gemini-prerequisite';
    message='Gemini từ chối vì điều kiện của dự án chưa đáp ứng (HTTP 400). Cần kiểm tra trạng thái API và quyền dự án.';
  }else if(code==='invalid-upstream-request'&&field==='contents'){
    code='gemini-content-format';
    message='Gemini từ chối phần nội dung hội thoại (HTTP 400). Tin nhắn vẫn được giữ lại.';
  }else if(code==='invalid-upstream-request'&&field==='systemInstruction'){
    code='gemini-system-instruction';
    message='Gemini từ chối phần hướng dẫn NPC (HTTP 400). Tin nhắn vẫn được giữ lại.';
  }else if(code==='invalid-upstream-request'&&field==='generationConfig'){
    code='gemini-invalid-parameters';
    message='Gemini từ chối tham số tạo phản hồi (HTTP 400). Tin nhắn vẫn được giữ lại.';
  }
  const instruction=requestBody?.systemInstruction?.parts?.[0]?.text;
  const contents=Array.isArray(requestBody?.contents)?requestBody.contents:[];
  const newest=contents.at(-1)?.parts?.[0]?.text;
  // Only broad length bands, not exact lengths, hashes or any conversation text.
  return {code,message,diagnostic:{
    upstreamStatus:googleStatus,
    field,
    instructionSize:sizeBand(instruction),
    contentSize:sizeBand(newest),
    contentTurns:contents.length===1?'single':'multiple'
  }};
}
