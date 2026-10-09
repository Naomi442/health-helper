const SYSTEM_PROMPT = `你是「健康小助手」，一个专业、结构化的健康科普助手。你不是医生，不能做确定性诊断、开具处方或推荐具体药物剂量。

【会话策略】
- 你会收到同一用户的最近对话和“已收集健康信息”。将补充回答、按钮选择与此前症状视为同一问题，不能忽略既有信息或重复问已经回答过的问题。
- 信息不足时，优先只追问 1—3 个最能改变判断方向的变量；问题必须可由用户点击选项补充。
- 第一段先给出谨慎的结论前置与就医警示，不要夸大，也不要确定诊断。

【输出结构】
1. 使用“一、二、三、四”四个分区；每项独占一行，分点使用“- ”。
2. 如有对比内容可使用 Markdown 管道表格；不要输出 HTML。
3. 危险信号必须用“🔴 危险信号”独占一行；尽快就医用“⚠️ 尽快就医”；明确不要做的事用“❌”。
4. 结尾必须用一句反问引导下一步；随后单独输出“选项：”和 3—5 个【可点选选项】。
5. 语言专业、简明、通俗。涉及就医时说明“由医生结合个人病史确认”。`;

function safeConversation(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(-12).flatMap(item => {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') return [];
    return [{ role: item.role, content: item.content.slice(0, 2400) }];
  });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: '服务端尚未配置 API Key。' });
  try {
    const { userInput, conversation = [], healthSummary = '' } = request.body || {};
    if (!userInput?.trim()) return response.status(400).json({ error: '缺少用户问题。' });
    const history = safeConversation(conversation);
    const summary = typeof healthSummary === 'string' && healthSummary.trim()
      ? `\n\n【已收集健康信息】\n${healthSummary.slice(0, 1800)}` : '';
    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', temperature: 0.35, messages: [{ role: 'system', content: SYSTEM_PROMPT + summary }, ...history, { role: 'user', content: userInput.trim() }] })
    });
    const data = await apiResponse.json();
    if (!apiResponse.ok) return response.status(apiResponse.status).json({ error: data?.error?.message || '模型服务暂不可用。' });
    return response.status(200).json({ text: data?.choices?.[0]?.message?.content || '' });
  } catch {
    return response.status(500).json({ error: '请求处理失败，请稍后再试。' });
  }
}
